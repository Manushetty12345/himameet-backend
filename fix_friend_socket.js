const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

// We can just find every occurrence of "res.status(200).json" and "res.json" that represents a successful friend action
// and prepend the socket io emission to it.
// Wait, a better way is to replace `res.json({ status: 'success'` or `res.status(200).json({ status: 'success'`
// Let's inject a helper function at the top
const helper = `
const pool = require('../db');

function notifyFriendUpdate(req, user1, user2) {
  const io = req.app.get('io');
  if (io) {
    if (user1) io.to(\`user_\${user1}\`).emit('friend_update');
    if (user2) io.to(\`user_\${user2}\`).emit('friend_update');
  }
}
`;

content = content.replace("const pool = require('../db');", helper);

// Send Request
content = content.replace(
  `res.status(201).json({ status: 'success', message: 'Friend request sent' });`,
  `notifyFriendUpdate(req, senderId, target_user_id);\n    res.status(201).json({ status: 'success', message: 'Friend request sent' });`
);

// Cancel Request
content = content.replace(
  `res.status(200).json({ status: 'success', message: 'Friend request cancelled' });`,
  `notifyFriendUpdate(req, senderId, target_user_id);\n    res.status(200).json({ status: 'success', message: 'Friend request cancelled' });`
);

// Accept Request
content = content.replace(
  `res.status(200).json({ status: 'success', message: 'Friend request accepted' });`,
  `notifyFriendUpdate(req, receiverId, target_user_id);\n    res.status(200).json({ status: 'success', message: 'Friend request accepted' });`
);

// Reject Request
content = content.replace(
  `res.status(200).json({ status: 'success', message: 'Friend request rejected' });`,
  `notifyFriendUpdate(req, receiverId, target_user_id);\n    res.status(200).json({ status: 'success', message: 'Friend request rejected' });`
);

// Remove Friend
content = content.replace(
  `res.status(200).json({ status: 'success', message: 'Friend removed' });`,
  `notifyFriendUpdate(req, userId, target_user_id);\n    res.status(200).json({ status: 'success', message: 'Friend removed' });`
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
