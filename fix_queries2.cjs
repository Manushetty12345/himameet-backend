const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

indexCode = indexCode.replace(/phone_number = \\/g, 'phone_number = $1');
indexCode = indexCode.replace(/user_id = \\/g, 'user_id = $1');
indexCode = indexCode.replace(/creator_id = \\/g, 'creator_id = $1');
indexCode = indexCode.replace(/follower_id = \\/g, 'follower_id = $1');
indexCode = indexCode.replace(/following_id = \\/g, 'following_id = $1');
indexCode = indexCode.replace(/reporter_id = \\/g, 'reporter_id = $1');
indexCode = indexCode.replace(/reported_user_id = \\/g, 'reported_user_id = $1');
indexCode = indexCode.replace(/blocker_id = \\/g, 'blocker_id = $1');
indexCode = indexCode.replace(/blocked_id = \\/g, 'blocked_id = $1');
indexCode = indexCode.replace(/caller_id = \\/g, 'caller_id = $1');
indexCode = indexCode.replace(/receiver_id = \\/g, 'receiver_id = $1');
indexCode = indexCode.replace(/WHERE id = \\/g, 'WHERE id = $1');

fs.writeFileSync('index.js', indexCode, 'utf8');
