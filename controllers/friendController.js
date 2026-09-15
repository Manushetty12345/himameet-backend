
const pool = require('../db');

function notifyFriendUpdate(req, user1, user2) {
  const io = req.app.get('io');
  if (io) {
    if (user1) io.to(`user_${user1}`).emit('friend_update');
    if (user2) io.to(`user_${user2}`).emit('friend_update');
    console.log(`?? [WebSocket] Emitted 'friend_update' event to user_${user1} and user_${user2}`);
  } else {
    console.log('?? [WebSocket ERROR] IO is undefined in req.app!');
  }
}


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

    const [blockRows] = await pool.query(`
        SELECT * FROM blocked_users 
        WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
      `, [userId, targetUserId]);
      
      if (blockRows.length > 0) {
        return res.status(200).json({ status: 'success', data: { friend_status: 'blocked' } });
      }

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

    notifyFriendUpdate(req, userId, target_user_id);
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

    notifyFriendUpdate(req, userId, target_user_id);
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

    notifyFriendUpdate(req, userId, target_user_id);
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

    notifyFriendUpdate(req, userId, target_user_id);
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
