const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

// Add a debug endpoint at the end of the file
const debugEndpoint = `
exports.debugFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(\`
      SELECT 
        u.id AS user_id, 
        c.id AS conversation_id,
        c.last_message_id,
        m.id AS msg_table_id,
        m.message_text AS "lastMessage",
        m.status AS "lastMessageStatus"
      FROM friendships f
      JOIN users u ON (u.id = f.user_one_id OR u.id = f.user_two_id) AND u.id != $1
      LEFT JOIN conversations c ON (c.user_one_id = u.id AND c.user_two_id = $1) OR (c.user_one_id = $1 AND c.user_two_id = u.id)
      LEFT JOIN messages m ON m.id = c.last_message_id
      WHERE f.user_one_id = $2 OR f.user_two_id = $3
      LIMIT 10
    \`, [userId, userId, userId]);
    
    res.json({ status: 'success', raw_db_rows: rows });
  } catch (err) {
    res.json({ error: err.message });
  }
};
`;

if (!content.includes('exports.debugFriends')) {
    content += debugEndpoint;
    fs.writeFileSync(file, content);
}

const routesFile = 'D:/App6/hima-meet-backend/update_routes.cjs'; // Or modify routes directly if possible
