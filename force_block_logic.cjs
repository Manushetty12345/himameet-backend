const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/creatorProfileController.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /exports\.blockUser = async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ status: 'error', message: 'Internal Server Error' \}\);\s*\}/;

const newFunc = `exports.blockUser = async (req, res) => {
  try {
    const creatorId = req.params.creator_id;
    const userId = req.user.id;
    const { deleteChat } = req.body;

    await pool.query("INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT (blocker_id, blocked_id) DO NOTHING", [userId, creatorId]);
    
    if (deleteChat) {
      const [convRows] = await pool.query(\`
        SELECT id FROM conversations 
        WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
      \`, [userId, creatorId]);
      
      if (convRows.length > 0) {
        const convId = convRows[0].id;
        // Break circular dependency
        await pool.query("UPDATE conversations SET last_message_id = NULL WHERE id = $1", [convId]);
        
        await pool.query("DELETE FROM messages WHERE conversation_id = $1", [convId]);
        await pool.query("DELETE FROM conversations WHERE id = $1", [convId]);
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
      \`, [userId, creatorId]);
    }

    res.status(200).json({ status: 'success', message: 'User blocked.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }`;

if (regex.test(content)) {
  content = content.replace(regex, newFunc);
  fs.writeFileSync(file, content);
  console.log("SUCCESS REPLACEMENT");
} else {
  console.log("FAILED REPLACEMENT - REGEX NOT MATCHED");
}
