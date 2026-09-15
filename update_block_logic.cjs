const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/creatorProfileController.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /await pool\.query\("DELETE FROM conversations WHERE id = \\\$1", \[convId\]\);/g,
  `await pool.query("DELETE FROM conversations WHERE id = $1", [convId]);
        }
        
        // Also remove friendship and friend requests so they have to send a request again
        await pool.query(\`
          DELETE FROM friendships 
          WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
        \`, [userId, creatorId]);
        
        await pool.query(\`
          DELETE FROM friend_requests 
          WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
        \`, [userId, creatorId]);
        
        await pool.query(\`
          DELETE FROM favourite_friends 
          WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
        \`, [userId, creatorId]);`
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
