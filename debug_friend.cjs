const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

// Inject console.log to see the response
content = content.replace(
  /const formattedData = rows\.map\(row => \(\{/g,
  `console.log("DEBUG getFriends rows:", rows.map(r => ({ id: r.user_id, lastMsg: r.lastMessage, lMsg: r.last_message, lsm: r.lastmessage })));\n      const formattedData = rows.map(row => ({`
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
