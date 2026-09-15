const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/friendController.js';
let content = fs.readFileSync(file, 'utf8');

// Add togglePin
if (!content.includes('togglePin')) {
  const togglePinFunc = `
/**
 * 7.9 Toggle Pin
 */
exports.togglePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friend_id } = req.params;

    // Check if pin exists
    const [existing] = await pool.query(
      'SELECT id FROM pinned_chats WHERE user_id = $1 AND friend_id = $2',
      [userId, friend_id]
    );

    if (existing.length > 0) {
      await pool.query('DELETE FROM pinned_chats WHERE id = $1', [existing[0].id]);
      res.status(200).json({ status: 'success', message: 'Chat unpinned' });
    } else {
      await pool.query(
        'INSERT INTO pinned_chats (user_id, friend_id) VALUES ($1, $2)',
        [userId, friend_id]
      );
      res.status(200).json({ status: 'success', message: 'Chat pinned' });
    }
  } catch (error) {
    console.error('Error in togglePin:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
`;
  content += togglePinFunc;
}

// Update getFriends SQL to include is_pinned
if (!content.includes('pc.id IS NOT NULL AS is_pinned')) {
  content = content.replace(
    /'friend' AS status/g,
    `'friend' AS status,
          pc.id IS NOT NULL AS is_pinned`
  );
  
  content = content.replace(
    /FROM friendships f\s*JOIN users u ON u.id = CASE\s*WHEN f.user_one_id = \$1 THEN f.user_two_id\s*ELSE f.user_one_id\s*END\s*LEFT JOIN auth a ON u.id = a.user_id\s*LEFT JOIN creator_settings cs ON u.id = cs.user_id\s*LEFT JOIN conversations c ON \(c.user_one_id = f.user_one_id AND c.user_two_id = f.user_two_id\) OR \(c.user_one_id = f.user_two_id AND c.user_two_id = f.user_one_id\)\s*LEFT JOIN messages m ON m.conversation_id = c.id AND m.id = \(SELECT MAX\(id\) FROM messages WHERE conversation_id = c.id\)/,
    `FROM friendships f
        JOIN users u ON u.id = CASE 
          WHEN f.user_one_id = $1 THEN f.user_two_id 
          ELSE f.user_one_id 
        END
        LEFT JOIN auth a ON u.id = a.user_id
        LEFT JOIN creator_settings cs ON u.id = cs.user_id
        LEFT JOIN conversations c ON (c.user_one_id = f.user_one_id AND c.user_two_id = f.user_two_id) OR (c.user_one_id = f.user_two_id AND c.user_two_id = f.user_one_id)
        LEFT JOIN messages m ON m.conversation_id = c.id AND m.id = (SELECT MAX(id) FROM messages WHERE conversation_id = c.id)
        LEFT JOIN pinned_chats pc ON pc.user_id = $1 AND pc.friend_id = u.id`
  );
}

fs.writeFileSync(file, content);
console.log("SUCCESS");
