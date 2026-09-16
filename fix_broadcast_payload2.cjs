const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /caller: callerInfo,\n\s*type,\n\s*rate: type === 'audio' \? creator\.call_rate : creator\.video_rate,/;
const newPayload = `callerId: callerInfo.id,
              name: callerInfo.name,
              avatar_url: callerInfo.avatarUri,
              call_type: type,
              type,
              rate: type === 'audio' ? creator.call_rate : creator.video_rate,`;

content = content.replace(regex, newPayload);
fs.writeFileSync(file, content);
console.log("SUCCESS");
