const pool = require('../db');

/**
 * 7.1 Send Friend Request
 */
exports.sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { target_user_id } = req.body;

    if (!target_user_id) {
      return res.status(400).json({ status: 'error', message: 'target_user_id is required' });
    }

    // Check if already friends
    const [friendRows] = await pool.query(`
      SELECT id FROM friendships 
      WHERE (user_one_id = ? AND user_two_id = ?) OR (user_one_id = ? AND user_two_id = ?)
    `, [senderId, target_user_id, target_user_id, senderId]);

    if (friendRows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Already friends' });
    }

    // Insert request
    await pool.query(`
      INSERT IGNORE INTO friend_requests (sender_id, receiver_id) 
      VALUES (?, ?)
    `, [senderId, target_user_id]);

    res.status(200).json({
      status: 'success',
      message: 'Friend request sent.'
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 7.2 Get Friends Lists
 */
exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(`
      SELECT 
        u.id AS user_id, 
        u.full_name AS name, 
        a.avatar_url,
        'friend' AS status
      FROM friendships f
      JOIN users u ON (u.id = f.user_one_id OR u.id = f.user_two_id) AND u.id != ?
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE f.user_one_id = ? OR f.user_two_id = ?
    `, [userId, userId, userId]);

    const formattedData = rows.map(row => ({
      ...row,
      avatar_url: row.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png'
    }));

    res.status(200).json({
      status: 'success',
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 7.3 Toggle Favourite
 */
exports.toggleFavourite = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friend_id;
    const { is_favourite } = req.body;

    if (is_favourite) {
      await pool.query(`INSERT IGNORE INTO favourite_friends (user_id, friend_id) VALUES (?, ?)`, [userId, friendId]);
      res.status(200).json({ status: 'success', message: 'Added to favourites.' });
    } else {
      await pool.query(`DELETE FROM favourite_friends WHERE user_id = ? AND friend_id = ?`, [userId, friendId]);
      res.status(200).json({ status: 'success', message: 'Removed from favourites.' });
    }
  } catch (error) {
    console.error('Error toggling favourite:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
