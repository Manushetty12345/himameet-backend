const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

const targetEmit = `io.to(\`user_\\${creator.id}\`).emit('incoming_call', {
              callId,
              caller: callerInfo,
              type,
              rate: type === 'audio' ? creator.call_rate : creator.video_rate,
              agoraToken,
              is_broadcast: true // Mark as broadcast so frontend knows
            });`;

const newEmit = `io.to(\`user_\\${creator.id}\`).emit('incoming_call', {
              callId,
              callerId: callerInfo.id,
              name: callerInfo.name,
              avatar_url: callerInfo.avatarUri,
              call_type: type,
              type,
              rate: type === 'audio' ? creator.call_rate : creator.video_rate,
              agoraToken,
              is_broadcast: true
            });`;

content = content.replace(targetEmit, newEmit);
fs.writeFileSync(file, content);
console.log("SUCCESS");
