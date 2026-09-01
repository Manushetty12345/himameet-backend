const pool = require('../db');

/**
 * 10.1 Get My Profile (Settings View)
 */
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await pool.query(`
      SELECT 
        u.id AS user_id, 
        u.full_name AS username, 
        a.avatar_url, 
        u.dnd_enabled
      FROM users u
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE u.id = $1
    `, [userId]);

    const [walletRows] = await pool.query(`SELECT coin_balance FROM wallets WHERE user_id = $1`, [userId]);

    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const profile = userRows[0];
    profile.avatar_url = profile.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png';
    profile.wallet_balance = walletRows.length > 0 ? parseFloat(walletRows[0].coin_balance) : 0;
    profile.dnd_enabled = !!profile.dnd_enabled;

    res.status(200).json({
      status: 'success',
      data: profile
    });
  } catch (error) {
    console.error('Error fetching my profile:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 10.2 Edit Profile
 */
exports.editProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, avatar_id } = req.body;

    if (!username || !avatar_id) {
      return res.status(400).json({ status: 'error', message: 'username and avatar_id are required' });
    }

    await pool.query(`UPDATE users SET full_name = $1, avatar_id = $2 WHERE id = $3`, [username, avatar_id, userId]);

    const [avatarRows] = await pool.query(`SELECT avatar_url FROM avatars WHERE id = $1`, [avatar_id]);
    const avatarUrl = avatarRows.length > 0 ? avatarRows[0].avatar_url : 'https://hima-bucket.s3.amazonaws.com/default-avatar.png';

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        username: username,
        avatar_url: avatarUrl
      }
    });
  } catch (error) {
    console.error('Error editing profile:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 10.3 Get Transactions
 */
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(`
      SELECT 
        id AS transaction_id, 
        type, 
        coins, 
        amount_paid AS amount_inr, 
        'success' AS status, 
        created_at AS timestamp 
      FROM coin_transactions 
      WHERE user_id = $1
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId]);

    res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 10.4 Get Referral Stats (Dummy)
 */
exports.getReferralStats = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      invite_code: "HIMA" + req.user.id + "X",
      total_invites: 0,
      coins_per_invite: 40,
      total_coins_earned: 0,
      share_message: "Join me on Hi ma and get free coins! Use code: HIMA" + req.user.id + "X"
    }
  });
};

/**
 * 10.5 Toggle DND
 */
exports.toggleDnd = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled } = req.body;

    await pool.query(`UPDATE users SET dnd_enabled = $1 WHERE id = $2`, [enabled ? true : false, userId]);

    res.status(200).json({
      status: 'success',
      message: 'DND status updated.'
    });
  } catch (error) {
    console.error('Error toggling DND:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 10.6 Get Admin Warnings
 */
exports.getWarnings = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(`
      SELECT id, reason, created_at AS issued_at 
      FROM user_warnings 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);

    res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('Error fetching warnings:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 10.8 Delete Account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(`UPDATE users SET account_status = 'pending_deletion' WHERE id = $1`, [userId]);

    res.status(200).json({
      status: 'success',
      message: 'Account scheduled for deletion in 30 days.'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 10.10 Get Notifications (Dummy)
 */
exports.getNotifications = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: [
      {
        notification_id: 1,
        title: "Welcome to Hima",
        body: "Your profile is set up successfully!",
        is_read: false,
        timestamp: new Date()
      }
    ]
  });
};
