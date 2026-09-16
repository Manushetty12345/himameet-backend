const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

// Replace io.to(`user_${callerId}`).emit('call_accepted', { callId, agoraToken, rate: actualRate });
// with code that fetches the receiver's info and sends it.

const regex = /        \/\/ 5\. Notify the Caller\r?\n\s*io\.to\(`user_\$\{callerId\}`\)\.emit\('call_accepted', \{ callId, agoraToken, rate: actualRate \}\);/;

const newBlock = `        // 5. Notify the Caller
        // Fetch the winning receiver's info so the caller UI can update from the "dummy" random profile to the real person
        const [receiverProfile] = await pool.query(
          \`SELECT u.full_name, a.avatar_url 
          FROM users u 
          LEFT JOIN avatars a ON u.avatar_id = a.id 
          WHERE u.id = $1\`, 
          [receiverId]
        );
        const receiverName = receiverProfile.length > 0 ? receiverProfile[0].full_name : 'Creator';
        const receiverAvatar = receiverProfile.length > 0 ? receiverProfile[0].avatar_url : 'https://i.pravatar.cc/300';

        io.to(\`user_\${callerId}\`).emit('call_accepted', { 
          callId, 
          agoraToken, 
          rate: actualRate,
          receiverId: receiverId,
          receiverName: receiverName,
          receiverAvatar: receiverAvatar
        });`;

content = content.replace(regex, newBlock);
fs.writeFileSync(file, content);
console.log("SUCCESS");
