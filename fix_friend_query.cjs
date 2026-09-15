const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add the missing LEFT JOIN for pinned_chats
content = content.replace(
  /LEFT JOIN messages m ON m\.id = c\.last_message_id/g,
  "LEFT JOIN messages m ON m.id = c.last_message_id\n        LEFT JOIN pinned_chats pc ON pc.user_id = $1 AND pc.friend_id = u.id"
);

// 2. Add is_pinned to the formattedData response
content = content.replace(
  /unreadCount: row\.unread_count/g,
  "unreadCount: row.unread_count,\n        is_pinned: row.is_pinned"
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
