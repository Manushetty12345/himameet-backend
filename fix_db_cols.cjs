const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: query in initiate_random_broadcast
content = content.replace(/COALESCE\(cs\.call_rate, 20\) AS call_rate/g, 'COALESCE(cs.voice_rate_per_min, 20) AS call_rate');
content = content.replace(/COALESCE\(cs\.video_rate, 40\) AS video_rate/g, 'COALESCE(cs.video_rate_per_min, 40) AS video_rate');

// Fix 2: query in accept_call
content = content.replace(/SELECT call_rate, video_rate FROM creator_settings/g, 'SELECT voice_rate_per_min, video_rate_per_min FROM creator_settings');

// Fix 3: JS property access in accept_call
content = content.replace(/creatorSettings\[0\]\.call_rate/g, 'creatorSettings[0].voice_rate_per_min');
content = content.replace(/creatorSettings\[0\]\.video_rate/g, 'creatorSettings[0].video_rate_per_min');

fs.writeFileSync(file, content);
console.log("SUCCESS");
