const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

indexCode = indexCode.replace(/WHERE phone_number = /g, 'WHERE phone_number = \\');
indexCode = indexCode.replace(/WHERE user_id = /g, 'WHERE user_id = \\');
indexCode = indexCode.replace(/OR creator_id = /g, 'OR creator_id = \\');
indexCode = indexCode.replace(/follower_id = /g, 'follower_id = \\');
indexCode = indexCode.replace(/following_id = /g, 'following_id = \\');
indexCode = indexCode.replace(/reporter_id = /g, 'reporter_id = \\');
indexCode = indexCode.replace(/reported_user_id = /g, 'reported_user_id = \\');
indexCode = indexCode.replace(/blocker_id = /g, 'blocker_id = \\');
indexCode = indexCode.replace(/blocked_id = /g, 'blocked_id = \\');
indexCode = indexCode.replace(/caller_id = /g, 'caller_id = \\');
indexCode = indexCode.replace(/receiver_id = /g, 'receiver_id = \\');
indexCode = indexCode.replace(/WHERE id = /g, 'WHERE id = \\');

fs.writeFileSync('index.js', indexCode, 'utf8');
