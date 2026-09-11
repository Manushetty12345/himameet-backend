const pool = require('../db');
const { sendCallNotification } = require('../utils/fcmService');

// Call timers tracking: { callId: intervalId }
const activeCallTimers = {};
// Track busy users
const activeUsersInCall = new Set();

module.exports = (io) => {
  io.on('connection', (socket) => {
    
    // Join a user room for direct signaling
    if (socket.user && socket.user.id) {
      socket.join(`user_${socket.user.id}`);
    }

    // 0. Initiate Call
    socket.on('initiate_call', async (data) => {
      const { targetId, type, rate } = data;
      const callerId = socket.user.id;

      if (activeUsersInCall.has(String(targetId)) || activeUsersInCall.has(targetId)) {
        return socket.emit('call_busy', { message: 'The user is currently on another call. Please try again later.' });
      }

      try {
        const [result] = await pool.query(
          `INSERT INTO call_logs (caller_id, receiver_id, call_type, rate_per_min, status) VALUES ($1, $2, $3, $4, 'initiated') RETURNING id`,
          [callerId, targetId, type, rate]
        );
        const callId = result[0].id;
        
        // Fetch caller info
        const [callerRows] = await pool.query(`
          SELECT u.full_name AS name, a.avatar_url 
          FROM users u 
          LEFT JOIN avatars a ON u.avatar_id = a.id 
          WHERE u.id = $1
        `, [callerId]);

        const callerName = callerRows.length > 0 ? callerRows[0].name : 'User';
        const callerAvatar = callerRows.length > 0 ? callerRows[0].avatar_url : 'https://hima-bucket.s3.amazonaws.com/default-avatar.png';
        
        socket.join(`call_${callId}`);
        
        // Let the receiver know
        io.to(`user_${targetId}`).emit('incoming_call', {
          callId,
          callerId,
          name: callerName,
          avatar_url: callerAvatar,
          call_type: type,
          type,
          rate,
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
          });
        }
      } catch (err) {
        console.error('Error initiating call:', err);
      }
    });

    socket.on('accept_call', async (data) => {
      const { callId, callerId } = data;
      socket.join(`call_${callId}`);
      
      activeUsersInCall.add(String(socket.user.id));
      activeUsersInCall.add(String(callerId));
      
      io.to(`user_${callerId}`).emit('call_accepted', { callId });
    });

    socket.on('decline_call', async (data) => {
      const { callId, callerId } = data;
      try {
        await pool.query(`UPDATE call_logs SET status = 'missed', end_reason = 'declined', ended_at = NOW() WHERE id = $1`, [callId]);
        io.to(`user_${callerId}`).emit('call_declined', { callId });
      } catch (err) {
        console.error('Error declining call:', err);
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

    // When app is killed/closed, mark creator unavailable so male sees correct status
    socket.on('disconnect', async () => {
      try {
        const userId = socket.user?.id;
        if (!userId) return;

        // Update creator_settings to mark both voice + video as unavailable
        await pool.query(
          `UPDATE creator_settings SET is_voice_online = false, is_video_online = false WHERE user_id = $1`,
          [userId]
        );

        // Notify all connected users that this creator is now offline
        io.emit('creator_availability_changed', {
          userId,
          voiceAvailable: false,
          videoAvailable: false,
        });

        console.log(`[Socket] Creator ${userId} marked unavailable on disconnect`);
      } catch (err) {
        // Not a creator — that's fine, ignore
      }
    });

  });
};

function startCallBillingTimer(callId, io) {
  if (activeCallTimers[callId]) return; // Already running

  console.log(`Starting billing timer for call ${callId}`);
  
  // Run every 60 seconds (60000 ms)
  let tick = 0;
  activeCallTimers[callId] = setInterval(async () => {
    try {
      tick++;
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
        // Insufficient Coins! Force end call.
        stopCallBillingTimer(callId);
        await pool.query(`UPDATE call_logs SET status = 'completed', end_reason = 'insufficient_coins', ended_at = NOW() WHERE id = $1`, [callId]);
        io.to(`call_${callId}`).emit('insufficient_coins', { message: 'Caller ran out of coins. Call ended.' });
        io.in(`call_${callId}`).socketsLeave(`call_${callId}`);
        return;
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
  }, 60000); // 60 seconds
}

function stopCallBillingTimer(callId) {
  if (activeCallTimers[callId]) {
    clearInterval(activeCallTimers[callId]);
    delete activeCallTimers[callId];
    console.log(`Stopped billing timer for call ${callId}`);
  }
}

module.exports.activeUsersInCall = activeUsersInCall;
