const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

// Move block check to the top
content = content.replace(
  /const \[friendRows\] = await pool\.query\([\s\S]*?if \(blockRows\.length > 0\) \{\s*return res\.status\(200\)\.json\(\{ status: 'success', data: \{ friend_status: 'blocked' \} \}\);\s*\}/,
  `const [blockRows] = await pool.query(\`
        SELECT * FROM blocked_users 
        WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
      \`, [userId, targetUserId]);
      
      if (blockRows.length > 0) {
        return res.status(200).json({ status: 'success', data: { friend_status: 'blocked' } });
      }

      const [friendRows] = await pool.query(\`
        SELECT user_one_id FROM friendships 
        WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
      \`, [userId, targetUserId]);
  
      if (friendRows.length > 0) {
        return res.status(200).json({ status: 'success', data: { friend_status: 'friends' } });
      }
  
      const [requestRows] = await pool.query(\`
        SELECT sender_id FROM friend_requests 
        WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      \`, [userId, targetUserId]);
  
      if (requestRows.length > 0) {
        return res.status(200).json({ status: 'success', data: { friend_status: 'pending' } });
      }`
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
