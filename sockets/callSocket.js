const pool = require('../db');
const { sendCallNotification } = require('../utils/fcmService');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Call timers tracking: { callId: intervalId }
const activeCallTimers = {};
// Track busy users
const activeUsersInCall = new Set();
const activeCallGrace = new Map(); // Tracks how many ticks a call has been in grace period
const activeCallRecharging = new Set(); // Tracks if a caller has tapped "Recharge"

module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('recharging_call', ({ callId }) => {
      if (callId) {
        activeCallRecharging.add(callId);
      }
    });
    
    socket.on('cancel_recharging_call', ({ callId }) => {
      if (callId) {
        activeCallRecharging.delete(callId);
      }
    });

    // Join a user room for direct signaling
    if (socket.user && socket.user.id) {
      socket.join(`user_${socket.user.id}`);
    }

    // 0. Initiate Call
    socket.on('initiate_call', async (data) => {
      const { targetId, type, rate } = data;
      const callerId = socket.user.id;

      // Ensure Caller isn't on DND
      const [callerRows] = await pool.query(`SELECT dnd_enabled, dnd_until FROM users WHERE id = $1`, [callerId]);
      if (callerRows.length > 0 && callerRows[0].dnd_enabled) {
        // If dnd_until is expired, we should technically disable it, but for now we just block if it's active.
        // The frontend will intercept this specific message.
        return socket.emit('call_blocked_dnd', { message: 'Do Not Disturb is on' });
      }

      // Check if user is busy or on DND
      const [targetRows] = await pool.query(`SELECT dnd_enabled FROM users WHERE id = $1`, [targetId]);
      if (targetRows.length > 0 && targetRows[0].dnd_enabled) {
        return socket.emit('call_busy', { message: 'This user is currently on Do Not Disturb.' });
      }

      if (activeUsersInCall.has(String(targetId)) || activeUsersInCall.has(targetId)) {
        return socket.emit('call_busy', { message: 'The user is currently on another call. Please try again.' });
      }

      try {
        // Check if caller has enough coins
        const [walletRows] = await pool.query(`SELECT coin_balance FROM wallets WHERE user_id = $1`, [callerId]);
        if (walletRows.length === 0 || parseFloat(walletRows[0].coin_balance) < rate) {
          return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.', requiredCoins: rate });
        }

        const [result] = await pool.query(
          `INSERT INTO call_logs (caller_id, receiver_id, call_type, rate_per_min, status) VALUES ($1, $2, $3, $4, 'initiated') RETURNING id`,
          [callerId, targetId, type, rate]
        );
        const callId = result[0].id;
        
        const channelName = `call_${callId}`;
        const uid = 0;
        const role = RtcRole.PUBLISHER;
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        let agoraToken = '';
        if (AGORA_APP_ID && AGORA_APP_CERTIFICATE) {
          agoraToken = RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);
          console.log(`[Agora Token Generated for ${channelName}]:`, agoraToken);
        } else {
          console.error('[Agora Token Failed]: AGORA_APP_ID or CERTIFICATE missing!');
        }

        // Fetch caller info
        const [callerRows] = await pool.query(`
          SELECT u.full_name AS name, a.avatar_url 
          FROM users u 
          LEFT JOIN avatars a ON u.avatar_id = a.id 
          WHERE u.id = $1
        `, [callerId]);

        const callerName = callerRows.length > 0 ? callerRows[0].name : 'User';
        const callerAvatar = callerRows.length > 0 ? callerRows[0].avatar_url : 'https://hima-bucket.s3.amazonaws.com/default-avatar.png';

        socket.join(channelName);

        // Let the receiver know
        io.to(`user_${targetId}`).emit('incoming_call', {
          callId,
          callerId,
          name: callerName,
          avatar_url: callerAvatar,
          call_type: type,
          type,
          rate,
          agoraToken,
        });

        // If the user is offline (no active socket in their room), send FCM push notification
        const receiverRoom = io.sockets.adapter.rooms.get(`user_${targetId}`);
        if (!receiverRoom || receiverRoom.size === 0) {
          console.log(`[FCM] User ${targetId} is offline. Sending push notification...`);
          sendCallNotification(targetId, {
            callId,
            callerId,
            name: callerName,
            avatar_url: callerAvatar,
            call_type: type,
            rate,
            agoraToken,
          });
        }

        // Auto-cancel if not accepted within 35 seconds
        const autoCancel = setTimeout(async () => {
          try {
            const [rows] = await pool.query(`SELECT status FROM call_logs WHERE id = $1`, [callId]);
            if (rows.length > 0 && rows[0].status === 'initiated') {
              await pool.query(`UPDATE call_logs SET status = 'missed', end_reason = 'no_answer', ended_at = NOW() WHERE id = $1`, [callId]);
              socket.emit('call_timeout', { callId, message: 'No answer. Please try again.' });
              console.log(`[Call] Auto-cancelled call ${callId} after timeout.`);
              
              // Tell FCM to cancel the push notification on the female's phone
              const { sendCallCancelNotification } = require('../utils/fcmService');
              sendCallCancelNotification(targetId, callId);
            }
          } catch (e) { console.error('Auto-cancel error:', e); }
        }, 35000);

        // Clear the auto-cancel if they accept or decline before timeout
        socket.once('call_accepted_ack_' + callId, () => clearTimeout(autoCancel));
        socket.once('call_declined_' + callId, () => clearTimeout(autoCancel));
      } catch (err) {
        console.error('Error initiating call:', err);
      }
    });


    // --- BROADCAST RANDOM CALL ---
    socket.on('initiate_random_broadcast', async (data) => {
      console.log('?? BACKEND: initiate_random_broadcast called. data:', data);
      const callerId = socket.userId;
      if (!callerId) return;

      const type = data?.type || 'audio';

      try {
        // Ensure Caller isn't on DND
        const [callerRows] = await pool.query(`SELECT dnd_enabled FROM users WHERE id = $1`, [callerId]);
        if (callerRows.length > 0 && callerRows[0].dnd_enabled) {
          return socket.emit('call_blocked_dnd', { message: 'Do Not Disturb is on' });
        }

        // Fetch the dynamic global rates set by the admin
        const [settingRows] = await pool.query(`SELECT key, value FROM settings WHERE key IN ('default_voice_rate', 'default_video_rate')`);
        let globalAudioRate = 20;
        let globalVideoRate = 40;
        for (const row of settingRows) {
          if (row.key === 'default_voice_rate') globalAudioRate = parseInt(row.value, 10);
          if (row.key === 'default_video_rate') globalVideoRate = parseInt(row.value, 10);
        }

        // Check caller wallet for global rate to ensure they have minimum balance
        const defaultRate = type === 'audio' ? globalAudioRate : globalVideoRate;
        console.log('?? BACKEND: defaultRate for', type, 'is', defaultRate);
        const [walletRows] = await pool.query(`SELECT coin_balance FROM wallets WHERE user_id = $1`, [callerId]);
        
        let callerBalance = 0;
        if (walletRows.length > 0) {
           callerBalance = parseFloat(walletRows[0].coin_balance);
        }
        console.log('?? BACKEND: callerBalance is', callerBalance);

        if (walletRows.length === 0 || callerBalance < defaultRate) {
          console.log('?? BACKEND: Blocking call! Insufficient coins. Required:', defaultRate, 'Balance:', callerBalance);
          return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.', requiredCoins: defaultRate });
        }
        
        console.log('?? BACKEND: Caller has enough coins. Finding matches...');

        // Query up to 20 online creators available for calls
        const [creators] = await pool.query(`
          SELECT 
            u.id, u.full_name, a.avatar_url,
            COALESCE(cs.voice_rate_per_min, 20) AS call_rate,
            COALESCE(cs.video_rate_per_min, 40) AS video_rate
          FROM users u
          LEFT JOIN creator_settings cs ON u.id = cs.user_id
          LEFT JOIN avatars a ON u.avatar_id = a.id
          WHERE u.user_role = 'creator' 
            AND u.is_online = true 
            AND u.dnd_enabled = false
            AND (cs.is_available = true OR cs.is_available IS NULL)
          ORDER BY RANDOM()
          LIMIT 20
        `);

        if (creators.length === 0) {
          return socket.emit('call_declined', { message: 'No creators available right now.' });
        }

        // Create the call log with receiver_id = NULL if possible, but if constrained, we can insert NULL 
        // Wait, if receiver_id is NOT NULL, this will fail. Let's use the first creator as a dummy receiver_id, 
        // and update it when someone accepts.
        const dummyReceiverId = creators[0].id;

        const [result] = await pool.query(
          `INSERT INTO call_logs (caller_id, receiver_id, call_type, rate_per_min, status) VALUES ($1, $2, $3, $4, 'initiated') RETURNING id`,
          [callerId, dummyReceiverId, type, defaultRate]
        );
        const callId = result[0].id;
        
        // Generate Token
        const channelName = `call_${callId}`;
        const uid = 0;
        const role = RtcRole.PUBLISHER;
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        let agoraToken = '';
        if (AGORA_APP_ID && AGORA_APP_CERTIFICATE) {
          agoraToken = RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);
        }

        // Fetch Caller info for UI
        const [callerProfile] = await pool.query(`
          SELECT u.full_name, a.avatar_url 
          FROM users u 
          LEFT JOIN avatars a ON u.avatar_id = a.id 
          WHERE u.id = $1
        `, [callerId]);

        const callerInfo = {
          id: callerId,
          name: callerProfile[0]?.full_name || 'User',
          avatarUri: callerProfile[0]?.avatar_url || 'https://i.pravatar.cc/300'
        };

        // Broadcast to all queried creators
        creators.forEach(creator => {
          // Skip if they are in activeUsersInCall
          if (activeUsersInCall.has(String(creator.id))) return;
          
          io.to(`user_${creator.id}`).emit('incoming_call', {
            callId,
            callerId: callerInfo.id,
              name: callerInfo.name,
              avatar_url: callerInfo.avatarUri,
              call_type: type,
              type,
              rate: type === 'audio' ? creator.call_rate : creator.video_rate,
            agoraToken,
            is_broadcast: true // Mark as broadcast so frontend knows
          });
        });

        // We DO NOT send call_accepted here. The caller waits.
        // We will send a timeout event if no one answers within 30 seconds.
      } catch (err) {
        console.error('Error initiating random broadcast:', err);
      }
    });

    socket.on('accept_call', async (data) => {
      const { callId, callerId } = data;
      const receiverId = socket.user.id;

      try {
        // 1. Check if call is already accepted by someone else
        const [callRows] = await pool.query(`SELECT status, call_type, rate_per_min FROM call_logs WHERE id = $1`, [callId]);
        if (callRows.length === 0) return;
        
        const callData = callRows[0];
        if (callData.status !== 'initiated') {
          return socket.emit('call_declined', { message: 'This call has already been answered by someone else.' });
        }

        // 2. Determine actual rate for this creator
        let actualRate = parseFloat(callData.rate_per_min);
        
        // Fetch global rates as fallback
        const [settingRows] = await pool.query(`SELECT key, value FROM settings WHERE key IN ('default_voice_rate', 'default_video_rate')`);
        let globalAudioRate = 20;
        let globalVideoRate = 40;
        for (const row of settingRows) {
          if (row.key === 'default_voice_rate') globalAudioRate = parseFloat(row.value);
          if (row.key === 'default_video_rate') globalVideoRate = parseFloat(row.value);
        }

        const [creatorSettings] = await pool.query(
          `SELECT voice_rate_per_min, video_rate_per_min FROM creator_settings WHERE user_id = $1`, 
          [receiverId]
        );
        if (creatorSettings.length > 0) {
          actualRate = callData.call_type === 'audio' 
            ? parseFloat(creatorSettings[0].voice_rate_per_min || globalAudioRate) 
            : parseFloat(creatorSettings[0].video_rate_per_min || globalVideoRate);
        } else {
          actualRate = callData.call_type === 'audio' ? globalAudioRate : globalVideoRate;
        }

        // 3. Generate Agora Token
        const channelName = `call_${callId}`;
        const uid = 0;
        const role = RtcRole.PUBLISHER;
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        let agoraToken = '';
        if (AGORA_APP_ID && AGORA_APP_CERTIFICATE) {
          agoraToken = RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);
          console.log(`[Agora Token Generated for ${channelName} in accept_call]:`, agoraToken);
        } else {
          console.error('[Agora Token Failed in accept_call]: AGORA_APP_ID or CERTIFICATE missing!');
        }

        // 4. Atomically claim the call for this receiver
        const [updateResult] = await pool.query(
          `UPDATE call_logs 
           SET status = 'in_progress', 
               started_at = NOW(), 
               agora_token = $1, 
               agora_channel_name = $2, 
               receiver_id = $3, 
               rate_per_min = $4 
           WHERE id = $5 AND status = 'initiated' 
           RETURNING id`,
          [agoraToken, channelName, receiverId, actualRate, callId]
        );

        if (updateResult.length === 0) {
          // Another thread/socket beat us to the UPDATE
          return socket.emit('call_declined', { message: 'This call has already been answered.' });
        }

        activeUsersInCall.add(String(callerId));
        activeUsersInCall.add(String(receiverId));

        // 5. Notify the Caller
        // Fetch the winning receiver's info so the caller UI can update from the "dummy" random profile to the real person
        const [receiverProfile] = await pool.query(
          `SELECT u.full_name, a.avatar_url 
          FROM users u 
          LEFT JOIN avatars a ON u.avatar_id = a.id 
          WHERE u.id = $1`, 
          [receiverId]
        );
        const receiverName = receiverProfile.length > 0 ? receiverProfile[0].full_name : 'Creator';
        const receiverAvatar = receiverProfile.length > 0 ? receiverProfile[0].avatar_url : 'https://i.pravatar.cc/300';

        io.to(`user_${callerId}`).emit('call_accepted', { 
          callId, 
          agoraToken, 
          rate: actualRate,
          receiverId: receiverId,
          receiverName: receiverName,
          receiverAvatar: receiverAvatar
        });

        // 6. Broadcast cancellation to all OTHER creators to stop their ringing modal
        socket.broadcast.emit('call_cancelled', { callId });
        
      } catch (err) {
        console.error('Error in accept_call:', err);
      }
    });

    socket.on('decline_call', async (data) => {
      const { callId, callerId } = data;
      try {
        await pool.query(`UPDATE call_logs SET status = 'missed', end_reason = 'declined', ended_at = NOW() WHERE id = $1`, [callId]);
        io.to(`user_${callerId}`).emit('call_declined', { callId });
        
        // Ensure the ringing notification is cancelled
        const [rows] = await pool.query(`SELECT receiver_id FROM call_logs WHERE id = $1`, [callId]);
        if (rows.length > 0) {
          const { sendCallCancelNotification } = require('../utils/fcmService');
          sendCallCancelNotification(rows[0].receiver_id, callId);
        }
      } catch (err) {
        console.error('Error declining call:', err);
      }
    });

    socket.on('cancel_call', async (data) => {
      const { targetId } = data || {};
      const callerId = socket.user.id;
      
      try {
        let rows;
        if (targetId) {
          // Find the active 'initiated' call from callerId to targetId
          [rows] = await pool.query(
            `SELECT id FROM call_logs 
             WHERE caller_id = $1 AND receiver_id = $2 AND status = 'initiated' 
             ORDER BY created_at DESC LIMIT 1`,
            [callerId, targetId]
          );
        } else {
          // If no targetId is provided, find ANY initiated call by this caller
          // (Used for cancelling random matchmaking broadcast)
          [rows] = await pool.query(
            `SELECT id FROM call_logs 
             WHERE caller_id = $1 AND status = 'initiated' 
             ORDER BY created_at DESC LIMIT 1`,
            [callerId]
          );
        }

        if (rows.length > 0) {
          const callId = rows[0].id;
          
          // Update status
          await pool.query(
            `UPDATE call_logs SET status = 'missed', end_reason = 'cancelled', ended_at = NOW() WHERE id = $1`, 
            [callId]
          );

          if (targetId) {
            // Tell the receiver to stop ringing
            io.to(`user_${targetId}`).emit('call_cancelled', { callId });
            
            // Cancel the push notification
            const { sendCallCancelNotification } = require('../utils/fcmService');
            sendCallCancelNotification(targetId, callId);
          } else {
            // For random matches, broadcast to everyone so all ringing creators stop ringing
            io.emit('call_cancelled', { callId });
          }
          
          console.log(`[Call] Caller ${callerId} cancelled call ${callId} to ${targetId || 'broadcast'}`);
        }
      } catch (err) {
        console.error('Error cancelling call:', err);
      }
    });

    // 1. Join Call Room
    socket.on('join_call', async (data) => {
      const { callId } = data;
      socket.join(`call_${callId}`);
      console.log(`User ${socket.user.id} joined call_${callId}`);

      // Check how many people are in the call room
      const room = io.sockets.adapter.rooms.get(`call_${callId}`);
      if (room && room.size === 2) {
        // Both Male and Female are here! Start the billing timer!
        io.to(`call_${callId}`).emit('call_started', { message: 'Call is now active. Billing started.' });

        // Update DB status to ongoing
        await pool.query(`UPDATE call_logs SET status = 'ongoing', started_at = NOW() WHERE id = $1`, [callId]);

        startCallBillingTimer(callId, io);
      }
    });

    // 2. End Call / Leave
    socket.on('leave_call', async (data) => {
      const { callId } = data;
      socket.leave(`call_${callId}`);
      stopCallBillingTimer(callId);

      try {
        // Clear busy status
        const [callRows] = await pool.query(`SELECT caller_id, receiver_id FROM call_logs WHERE id = $1`, [callId]);
        if (callRows.length > 0) {
          activeUsersInCall.delete(String(callRows[0].caller_id));
          activeUsersInCall.delete(String(callRows[0].receiver_id));
        }

        // Update DB
        await pool.query(`UPDATE call_logs SET status = 'completed', ended_at = NOW() WHERE id = $1 AND status != 'completed'`, [callId]);

        io.to(`call_${callId}`).emit('call_ended', { message: 'The other user hung up.' });
      } catch (err) {
        console.error('Error ending call:', err);
      }
    });

    socket.on('disconnect', async () => {
      if (socket.user && socket.user.id) {
        const userIdStr = String(socket.user.id);
        
        // Only remove from memory so they don't get stuck on "another call"
        // Do NOT end the call here, because going to a payment app (PhonePe)
        // drops the socket temporarily. The call should stay alive!
        activeUsersInCall.delete(userIdStr);
      }
    });

  });
};

function startCallBillingTimer(callId, io) {
  if (activeCallTimers[callId]) return; // Already running

  console.log(`Starting billing timer for call ${callId}`);

  // Run every 60 seconds (60000 ms)
  let tick = 0;

  const billTick = async () => {
    try {
      tick++;

      // Prevent ghost calls: if room is completely empty, stop billing!
      const room = io.sockets.adapter.rooms.get(`call_${callId}`);
      if (!room || room.size === 0) {
        console.log(`[billTick] Room call_${callId} is empty. Abandoning ghost call.`);
        stopCallBillingTimer(callId);
        await pool.query(`UPDATE call_logs SET status = 'completed', end_reason = 'abandoned', ended_at = NOW() WHERE id = $1 AND status != 'completed'`, [callId]);
        return;
      }

      // Fetch call details
      const [callRows] = await pool.query(`SELECT caller_id, receiver_id, rate_per_min FROM call_logs WHERE id = $1`, [callId]);
      if (callRows.length === 0) return stopCallBillingTimer(callId);

      const { caller_id, receiver_id, rate_per_min } = callRows[0];
      const rate = parseFloat(rate_per_min);

      // Deduct from caller
      const [updateRes] = await pool.query(
        `UPDATE wallets SET coin_balance = coin_balance - $1 WHERE user_id = $2 AND coin_balance >= $3 RETURNING id`,
        [rate, caller_id, rate]
      );

      if (updateRes.length === 0) {
        // Only give grace period if they actually tapped "Recharge"
        if (activeCallRecharging.has(callId)) {
          let graceTicks = activeCallGrace.get(callId) || 0;
          if (graceTicks < 2) {
            activeCallGrace.set(callId, graceTicks + 1);
            console.log(`Call ${callId} entered grace period tick ${graceTicks + 1}`);
            io.to(`call_${callId}`).emit('grace_period_warning', { message: 'Please complete your payment to continue.' });
            return;
          }
        }

        // Insufficient Coins! Force end call.
        stopCallBillingTimer(callId);
        await pool.query(`UPDATE call_logs SET status = 'completed', end_reason = 'insufficient_coins', ended_at = NOW() WHERE id = $1`, [callId]);
        io.to(`call_${callId}`).emit('insufficient_coins', { message: 'Caller ran out of coins. Call ended.' });
        io.in(`call_${callId}`).socketsLeave(`call_${callId}`);
        return;
      } else {
        // They successfully paid, reset grace period and recharging status
        activeCallGrace.delete(callId);
        activeCallRecharging.delete(callId);
      }

      // Add to receiver
      await pool.query(`UPDATE wallets SET coin_balance = coin_balance + $1 WHERE user_id = $2`, [rate, receiver_id]);

      // Record the tick
      await pool.query(`INSERT INTO call_billing_ticks (call_id, tick_number, coins_deducted) VALUES ($1, $2, $3)`, [callId, tick, rate]);

      // Update total coins charged and duration in call_logs
      await pool.query(`
        UPDATE call_logs 
        SET coins_charged = coins_charged + $1, duration_seconds = duration_seconds + 60 
        WHERE id = $2
      `, [rate, callId]);

      // Log transactions
      await pool.query(`INSERT INTO coin_transactions (user_id, type, coins) VALUES ($1, 'call_spend', $2)`, [caller_id, -rate]);
      await pool.query(`INSERT INTO coin_transactions (user_id, type, coins) VALUES ($1, 'call_earn', $2)`, [receiver_id, rate]);

      console.log(`Billed ${rate} coins for call ${callId} (Tick ${tick})`);

    } catch (err) {
      console.error('Call billing error:', err);
    }
  };

  // Charge immediately for the first minute
  billTick();

  // Then charge every 60 seconds
  activeCallTimers[callId] = setInterval(billTick, 60000); // 60 seconds
}

function stopCallBillingTimer(callId) {
  if (activeCallTimers[callId]) {
    clearInterval(activeCallTimers[callId]);
    delete activeCallTimers[callId];
    console.log(`Stopped billing timer for call ${callId}`);
  }
  activeCallGrace.delete(callId);
  activeCallRecharging.delete(callId);
}

module.exports.activeUsersInCall = activeUsersInCall;
