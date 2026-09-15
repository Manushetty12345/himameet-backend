const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/creatorProfileController.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add query for favourite_friends
content = content.replace(
  /const \[blockRows\] = await pool\.query\(`/,
  `const [favouriteRows] = await pool.query(\`
        SELECT id FROM favourite_friends 
        WHERE user_id = $1 AND friend_id = $2
      \`, [userId, creatorId]);

      const [blockRows] = await pool.query(\``
);

// 2. Add is_favourite to response
content = content.replace(
  /is_notify_online_enabled: notifyRows\.length > 0,/,
  `is_notify_online_enabled: notifyRows.length > 0,
          is_favourite: favouriteRows.length > 0,`
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
