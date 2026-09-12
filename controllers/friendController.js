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

    const [friendRows] = await pool.query(`
      SELECT id FROM friendships 
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $3 AND user_two_id = $4)
    `, [senderId, target_user_id, target_user_id, senderId]);

    if (friendRows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Already friends' });
    }

    // PostgreSQL uses ON CONFLICT DO NOTHING instead of INSERT IGNORE
    await pool.query(`
      INSERT INTO friend_requests (sender_id, receiver_id) 
      VALUES ($1, $2)
      ON CONFLICT (sender_id, receiver_id) DO NOTHING
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
        CASE 
          WHEN u.user_role = 'creator' THEN (cs.is_voice_online = true OR cs.is_video_online = true)
          ELSE u.is_online 
        END AS is_online,
        cs.voice_rate_per_min AS voice_rate,
        cs.video_rate_per_min AS video_rate,
        (
          SELECT m.message_text 
          FROM conversations c 
          JOIN messages m ON c.last_message_id = m.id 
          WHERE (c.user_one_id = u.id AND c.user_two_id = $1) 
             OR (c.user_one_id = $1 AND c.user_two_id = u.id)
          LIMIT 1
        ) AS "lastMessage",
        'friend' AS status
      FROM friendships f
      JOIN users u ON (u.id = f.user_one_id OR u.id = f.user_two_id) AND u.id != $1
      LEFT JOIN avatars a ON u.avatar_id = a.id
      LEFT JOIN creator_settings cs ON cs.user_id = u.id
      WHERE f.user_one_id = $2 OR f.user_two_id = $3
    `, [userId, userId, userId]);

    const formattedData = rows.map(row => ({
      ...row,
      avatar_url: row.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png',
      voice: { rate_per_min: row.voice_rate },
      video: { rate_per_min: row.video_rate },
      lastMessage: row.lastMessage
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

exports.getFavourites = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(`
      SELECT 
        u.id AS user_id, 
        u.full_name AS name, 
        a.avatar_url, 
        CASE 
          WHEN u.user_role = 'creator' THEN (cs.is_voice_online = true OR cs.is_video_online = true)
          ELSE u.is_online 
        END AS is_online,
        cs.voice_rate_per_min AS voice_rate,
        cs.video_rate_per_min AS video_rate,
        (
          SELECT m.message_text 
          FROM conversations c 
          JOIN messages m ON c.last_message_id = m.id 
          WHERE (c.user_one_id = u.id AND c.user_two_id = $1) 
             OR (c.user_one_id = $1 AND c.user_two_id = u.id)
          LIMIT 1
        ) AS "lastMessage",
        'favourite' AS status
      FROM favourite_friends ff
      JOIN users u ON u.id = ff.friend_id
      LEFT JOIN avatars a ON u.avatar_id = a.id
      LEFT JOIN creator_settings cs ON cs.user_id = u.id
      WHERE ff.user_id = $1
    `, [userId]);
    const formattedData = rows.map(row => ({
      ...row, 
      avatar_url: row.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png',
      voice: { rate_per_min: row.voice_rate },
      video: { rate_per_min: row.video_rate },
      lastMessage: row.lastMessage
    }));
    res.status(200).json({ status: 'success', data: formattedData });
  } catch (error) {
    console.error('Error fetching favourites:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getRequestsReceived = async (req, res) => {
  try {
    const userId = req.user.id;

    // Requests sent TO me that are still pending (I am the receiver)
    const [pendingRows] = await pool.query(`
      SELECT u.id AS user_id, u.full_name AS name, a.avatar_url, 'received' AS status
      FROM friend_requests fr
      JOIN users u ON u.id = fr.sender_id
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
    `, [userId]);

    // Requests I SENT that the receiver has accepted (waiting for my confirmation)
    const [acceptedRows] = await pool.query(`
      SELECT u.id AS user_id, u.full_name AS name, a.avatar_url, 'accepted_by_receiver' AS status
      FROM friend_requests fr
      JOIN users u ON u.id = fr.receiver_id
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE fr.sender_id = $1 AND fr.status = 'accepted_by_receiver'
    `, [userId]);

    const combined = [...pendingRows, ...acceptedRows].map(row => ({
      ...row,
      avatar_url: row.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png'
    }));

    res.status(200).json({ status: 'success', data: combined });
  } catch (error) {
    console.error('Error fetching received requests:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getRequestsSent = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(`
      SELECT u.id AS user_id, u.full_name AS name, a.avatar_url, 'sent' AS status
      FROM friend_requests fr
      JOIN users u ON u.id = fr.receiver_id
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE fr.sender_id = $1 AND (fr.status = 'pending' OR fr.status IS NULL)
    `, [userId]);
    const formattedData = rows.map(row => ({
      ...row, avatar_url: row.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png'
    }));
    res.status(200).json({ status: 'success', data: formattedData });
  } catch (error) {
    console.error('Error fetching sent requests:', error);
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
      await pool.query(`INSERT INTO favourite_friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT (user_id, friend_id) DO NOTHING`, [userId, friendId]);
      res.status(200).json({ status: 'success', message: 'Added to favourites.' });
    } else {
      await pool.query(`DELETE FROM favourite_friends WHERE user_id = $1 AND friend_id = $2`, [userId, friendId]);
      res.status(200).json({ status: 'success', message: 'Removed from favourites.' });
    }
  } catch (error) {
    console.error('Error toggling favourite:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 7.4 Check Friend Status
 */
exports.checkStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.target_user_id;

    const [friendRows] = await pool.query(`
      SELECT user_one_id FROM friendships 
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
    `, [userId, targetUserId]);

    if (friendRows.length > 0) {
      return res.status(200).json({ status: 'success', data: { friend_status: 'friends' } });
    }

    const [requestRows] = await pool.query(`
      SELECT sender_id FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [userId, targetUserId]);

    if (requestRows.length > 0) {
      return res.status(200).json({ status: 'success', data: { friend_status: 'pending' } });
    }

    const [blockRows] = await pool.query(`
      SELECT * FROM blocked_users 
      WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
    `, [userId, targetUserId]);

    if (blockRows.length > 0) {
      return res.status(200).json({ status: 'success', data: { friend_status: 'blocked' } });
    }

    return res.status(200).json({ status: 'success', data: { friend_status: 'none' } });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 7.5 Cancel Friend Request
 */
exports.cancelRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_user_id } = req.body;

    await pool.query(`
      DELETE FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [userId, target_user_id]);

    res.status(200).json({ status: 'success', message: 'Friend request cancelled.' });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 7.6 Accept Friend Request (by RECEIVER only — sets status to accepted_by_receiver)
 * The SENDER must then confirm via /confirm endpoint to create the friendship.
 */
exports.acceptRequest = async (req, res) => {
  try {
    const userId = req.user.id; // This is the RECEIVER
    const { target_user_id } = req.body; // This is the SENDER

    await pool.query(`
      UPDATE friend_requests
      SET status = 'accepted_by_receiver'
      WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
    `, [target_user_id, userId]);

    res.status(200).json({ status: 'success', message: 'Request accepted. Waiting for sender confirmation.' });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 7.6b Confirm Friend Request (by SENDER — creates actual friendship)
 */
exports.confirmRequest = async (req, res) => {
  try {
    const userId = req.user.id; // This is the original SENDER (male)
    const { target_user_id } = req.body; // This is the RECEIVER (female) who accepted

    // Delete the request
    await pool.query(
      `DELETE FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2`,
      [userId, target_user_id]
    );

    // Create the friendship (no status column in this table)
    await pool.query(
      `INSERT INTO friendships (user_one_id, user_two_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, target_user_id]
    );

    res.status(200).json({ status: 'success', message: 'Friendship confirmed!' });
  } catch (error) {
    console.error('Error confirming friendship:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 7.7 Remove Friend (Delete Chat)
 */
exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_user_id } = req.body;

    await pool.query(`
      DELETE FROM friendships 
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
    `, [userId, target_user_id]);

    res.status(200).json({ status: 'success', message: 'Friend removed.' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 7.8 Block User
 */
exports.blockUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_user_id } = req.body;

    // Remove friendship
    await pool.query(`
      DELETE FROM friendships 
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
    `, [userId, target_user_id]);

    // Delete requests
    await pool.query(`
      DELETE FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [userId, target_user_id]);

    // Add block
    await pool.query(`
      INSERT INTO blocked_users (blocker_id, blocked_id) 
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [userId, target_user_id]);

    res.status(200).json({ status: 'success', message: 'User blocked successfully.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
