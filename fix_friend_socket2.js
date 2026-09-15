const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

function injectBefore(content, functionStr, replacement) {
  return content.replace(functionStr, replacement);
}

// 1. cancelRequest
content = injectBefore(content, 
  `res.status(200).json({ status: 'success', message: 'Friend request cancelled.' });`,
  `notifyFriendUpdate(req, userId, target_user_id);\n    res.status(200).json({ status: 'success', message: 'Friend request cancelled.' });`
);

// 2. removeFriend
content = injectBefore(content, 
  `res.status(200).json({ status: 'success', message: 'Friend removed.' });`,
  `notifyFriendUpdate(req, userId, target_user_id);\n    res.status(200).json({ status: 'success', message: 'Friend removed.' });`
);

// 3. sendRequest
content = injectBefore(content, 
  `res.status(201).json({ status: 'success', message: 'Friend request sent successfully.' });`,
  `notifyFriendUpdate(req, senderId, target_user_id);\n    res.status(201).json({ status: 'success', message: 'Friend request sent successfully.' });`
);

// 4. acceptRequest
content = injectBefore(content, 
  `res.status(200).json({ status: 'success', message: 'Request accepted. Waiting for sender confirmation.' });`,
  `notifyFriendUpdate(req, userId, target_user_id);\n    res.status(200).json({ status: 'success', message: 'Request accepted. Waiting for sender confirmation.' });`
);

// 5. confirmRequest
content = injectBefore(content, 
  `res.status(200).json({ status: 'success', message: 'Friendship confirmed!' });`,
  `notifyFriendUpdate(req, userId, target_user_id);\n    res.status(200).json({ status: 'success', message: 'Friendship confirmed!' });`
);

fs.writeFileSync(file, content);
console.log("INJECTED");
