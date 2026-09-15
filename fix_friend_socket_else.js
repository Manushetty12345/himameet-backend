const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `function notifyFriendUpdate(req, user1, user2) {
  const io = req.app.get('io');
  if (io) {
    if (user1) io.to(\`user_\${user1}\`).emit('friend_update');
    if (user2) io.to(\`user_\${user2}\`).emit('friend_update');
    console.log(\`?? [WebSocket] Emitted 'friend_update' event to user_\${user1} and user_\${user2}\`);
  }
}`;

const newStr = `function notifyFriendUpdate(req, user1, user2) {
  const io = req.app.get('io');
  if (io) {
    if (user1) io.to(\`user_\${user1}\`).emit('friend_update');
    if (user2) io.to(\`user_\${user2}\`).emit('friend_update');
    console.log(\`?? [WebSocket] Emitted 'friend_update' event to user_\${user1} and user_\${user2}\`);
  } else {
    console.log('?? [WebSocket ERROR] IO is undefined in req.app!');
  }
}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync(file, content);
  console.log("SUCCESS");
} else {
  // try CRLF
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
  if (normalizedContent.includes(normalizedTarget)) {
    content = normalizedContent.replace(normalizedTarget, newStr.replace(/\r\n/g, '\n'));
    fs.writeFileSync(file, content);
    console.log("SUCCESS via CRLF");
  } else {
    console.log("FAILED");
  }
}
