const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

// Ensure robust mapping of lastMessage by checking multiple possible case variants returned by different DB drivers
content = content.replace(
  /lastMessage: row\.lastMessage,/g,
  `lastMessage: row.lastMessage || row.lastmessage || row.last_message,`
);

content = content.replace(
  /lastMessageStatus: row\.lastMessageStatus,/g,
  `lastMessageStatus: row.lastMessageStatus || row.lastmessagestatus || row.last_message_status,`
);

content = content.replace(
  /lastMessageSenderId: row\.lastMessageSenderId,/g,
  `lastMessageSenderId: row.lastMessageSenderId || row.lastmessagesenderid || row.last_message_sender_id,`
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
