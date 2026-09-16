const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

const regex = /    socket\.on\('accept_call', async \(data\) => \{[\s\S]*?io\.to\(`user_\$\{callerId\}`\)\.emit\('call_accepted', \{ callId, agoraToken, rate \}\);\n      \}\);/;

const newBlock = `    socket.on('accept_call', async (data) => {
      const { callId, callerId } = data;
      const receiverId = socket.user.id;

      try {
        // 1. Check if call is already accepted by someone else
        const [callRows] = await pool.query(\`SELECT status, call_type, rate_per_min FROM call_logs WHERE id = $1\`, [callId]);
        if (callRows.length === 0) return;
        
        const callData = callRows[0];
        if (callData.status !== 'initiated') {
          return socket.emit('call_declined', { message: 'This call has already been answered by someone else.' });
        }

        // 2. Determine actual rate for this creator
        let actualRate = parseFloat(callData.rate_per_min);
        const [creatorSettings] = await pool.query(
          \`SELECT call_rate, video_rate FROM creator_settings WHERE user_id = $1\`, 
          [receiverId]
        );
        if (creatorSettings.length > 0) {
          actualRate = callData.call_type === 'audio' 
            ? parseFloat(creatorSettings[0].call_rate || 20) 
            : parseFloat(creatorSettings[0].video_rate || 40);
        }

        // 3. Generate Agora Token
        const channelName = \`call_\${callId}\`;
        const uid = 0;
        const role = RtcRole.PUBLISHER;
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        let agoraToken = '';
        if (AGORA_APP_ID && AGORA_APP_CERTIFICATE) {
          agoraToken = RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);
          console.log(\`[Agora Token Generated for \${channelName} in accept_call]:\`, agoraToken);
        } else {
          console.error('[Agora Token Failed in accept_call]: AGORA_APP_ID or CERTIFICATE missing!');
        }

        // 4. Atomically claim the call for this receiver
        const [updateResult] = await pool.query(
          \`UPDATE call_logs 
           SET status = 'in_progress', 
               started_at = NOW(), 
               agora_token = $1, 
               agora_channel_name = $2, 
               receiver_id = $3, 
               rate_per_min = $4 
           WHERE id = $5 AND status = 'initiated' 
           RETURNING id\`,
          [agoraToken, channelName, receiverId, actualRate, callId]
        );

        if (updateResult.length === 0) {
          // Another thread/socket beat us to the UPDATE
          return socket.emit('call_declined', { message: 'This call has already been answered.' });
        }

        activeUsersInCall.add(String(callerId));
        activeUsersInCall.add(String(receiverId));

        // 5. Notify the Caller
        io.to(\`user_\${callerId}\`).emit('call_accepted', { callId, agoraToken, rate: actualRate });

        // 6. Broadcast cancellation to all OTHER creators to stop their ringing modal
        // Since we don't store exactly who we broadcasted to in the DB, we can just broadcast globally 
        // to all users, and the frontend will ignore it if it doesn't match their current ringing callId.
        // But better: use a general broadcast channel if we had one. For now, socket.broadcast.emit
        socket.broadcast.emit('cancel_incoming_call', { callId });
        
      } catch (err) {
        console.error('Error in accept_call:', err);
      }
    });`;

if (content.match(regex)) {
  content = content.replace(regex, newBlock);
  fs.writeFileSync(file, content);
  console.log("SUCCESS");
} else {
  console.log("REGEX NOT MATCHED");
}
