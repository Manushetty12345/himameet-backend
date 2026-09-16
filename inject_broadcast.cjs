const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

// I want to insert my new code right before:
// socket.on('accept_call', async (data) => {

const newCode = `
    // --- BROADCAST RANDOM CALL ---
    socket.on('initiate_random_broadcast', async (data) => {
      const { type } = data;
      const callerId = socket.user.id;

      // Ensure Caller isn't on DND
      const [callerRows] = await pool.query(\`SELECT dnd_enabled FROM users WHERE id = $1\`, [callerId]);
      if (callerRows.length > 0 && callerRows[0].dnd_enabled) {
        return socket.emit('call_blocked_dnd', { message: 'Do Not Disturb is on' });
      }

      // Check caller wallet for default rate (20/40) to ensure they have minimum balance
      const defaultRate = type === 'audio' ? 20 : 40;
      const [walletRows] = await pool.query(\`SELECT coin_balance FROM wallets WHERE user_id = $1\`, [callerId]);
      if (walletRows.length === 0 || parseFloat(walletRows[0].coin_balance) < defaultRate) {
        return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.' });
      }

      try {
        // Query up to 20 online creators available for calls
        const [creators] = await pool.query(\`
          SELECT 
            u.id, u.full_name, a.avatar_url,
            COALESCE(cs.call_rate, 20) AS call_rate,
            COALESCE(cs.video_rate, 40) AS video_rate
          FROM users u
          LEFT JOIN creator_settings cs ON u.id = cs.user_id
          LEFT JOIN avatars a ON u.avatar_id = a.id
          WHERE u.user_role = 'creator' 
            AND u.is_online = true 
            AND u.dnd_enabled = false
            AND (cs.is_available = true OR cs.is_available IS NULL)
          ORDER BY RANDOM()
          LIMIT 20
        \`);

        if (creators.length === 0) {
          return socket.emit('call_declined', { message: 'No creators available right now.' });
        }

        // Create the call log with receiver_id = NULL if possible, but if constrained, we can insert NULL 
        // Wait, if receiver_id is NOT NULL, this will fail. Let's use the first creator as a dummy receiver_id, 
        // and update it when someone accepts.
        const dummyReceiverId = creators[0].id;

        const [result] = await pool.query(
          \`INSERT INTO call_logs (caller_id, receiver_id, call_type, rate_per_min, status) VALUES ($1, $2, $3, $4, 'initiated') RETURNING id\`,
          [callerId, dummyReceiverId, type, defaultRate]
        );
        const callId = result[0].id;
        
        // Generate Token
        const channelName = \`call_\${callId}\`;
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
        const [callerProfile] = await pool.query(\`
          SELECT u.full_name, a.avatar_url 
          FROM users u 
          LEFT JOIN avatars a ON u.avatar_id = a.id 
          WHERE u.id = $1
        \`, [callerId]);

        const callerInfo = {
          id: callerId,
          name: callerProfile[0]?.full_name || 'User',
          avatarUri: callerProfile[0]?.avatar_url || 'https://i.pravatar.cc/300'
        };

        // Broadcast to all queried creators
        creators.forEach(creator => {
          // Skip if they are in activeUsersInCall
          if (activeUsersInCall.has(String(creator.id))) return;
          
          io.to(\`user_\${creator.id}\`).emit('call_incoming', {
            callId,
            caller: callerInfo,
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
`;

content = content.replace(
  /    socket\.on\('accept_call', async \(data\) => \{/,
  newCode + "\n    socket.on('accept_call', async (data) => {"
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
