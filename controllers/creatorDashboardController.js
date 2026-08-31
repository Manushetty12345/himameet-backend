const pool = require('../db');

/**
 * 11.1 Get Dashboard Home
 */
exports.getDashboardHome = async (req, res) => {
  try {
    const creatorId = req.user.id;

    // 1. Calculate Today's Earnings
    const today = new Date().toISOString().split('T')[0];
    const [earningRows] = await pool.query(`
      SELECT SUM(coins) as total_coins 
      FROM coin_transactions 
      WHERE user_id = ? AND type IN ('call_earn', 'chat_earn') AND DATE(created_at) = ?
    `, [creatorId, today]);
    
    const todaysCoins = earningRows[0].total_coins || 0;
    const conversionRate = 0.10; // e.g. 10 coins = 1 INR
    const todaysInr = todaysCoins * conversionRate;

    // 2. Get Status
    const [settingsRows] = await pool.query(`SELECT is_voice_online, is_video_online FROM creator_settings WHERE user_id = ?`, [creatorId]);
    const status = settingsRows.length > 0 ? settingsRows[0] : { is_voice_online: false, is_video_online: false };

    // 3. Get Pending Requests (Mocked to call_logs for demonstration, or friend_requests)
    const [pendingCalls] = await pool.query(`
      SELECT 
        c.id AS request_id, 
        u.id AS user_id, 
        u.full_name AS name, 
        a.avatar_url, 
        c.created_at AS sent_at 
      FROM call_logs c
      JOIN users u ON c.caller_id = u.id
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE c.receiver_id = ? AND c.status = 'ringing'
    `, [creatorId]);

    const formattedRequests = pendingCalls.map(req => ({
      ...req,
      avatar_url: req.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png'
    }));

    res.status(200).json({
      status: 'success',
      data: {
        todays_earnings_inr: parseFloat(todaysInr.toFixed(2)),
        todays_earnings_coins: parseInt(todaysCoins),
        status: {
          is_voice_online: !!status.is_voice_online,
          is_video_online: !!status.is_video_online
        },
        pending_requests: formattedRequests
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard home:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.2 Toggle Online Status
 */
exports.toggleStatus = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { call_type, is_online } = req.body;

    if (!['voice', 'video'].includes(call_type)) {
      return res.status(400).json({ status: 'error', message: 'Invalid call_type. Must be voice or video.' });
    }

    const column = call_type === 'voice' ? 'is_voice_online' : 'is_video_online';
    
    // Use INSERT ... ON DUPLICATE KEY UPDATE in case creator_settings doesn't exist yet
    await pool.query(`
      INSERT INTO creator_settings (user_id, ${column}) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE ${column} = ?
    `, [creatorId, is_online ? 1 : 0, is_online ? 1 : 0]);

    res.status(200).json({
      status: 'success',
      message: `${call_type === 'voice' ? 'Voice' : 'Video'} status updated to ${is_online ? 'Online' : 'Offline'}.`
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.5 Get Creator Call History
 */
exports.getCreatorCallHistory = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(`
      SELECT 
        c.id AS call_id,
        u.full_name AS caller_name,
        c.call_type,
        c.duration_seconds,
        c.coins_charged AS earnings_coins,
        c.status,
        c.created_at
      FROM call_logs c
      JOIN users u ON c.caller_id = u.id
      WHERE c.receiver_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [creatorId, limit, offset]);

    res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('Error fetching creator call history:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.6 Get Earnings Summary
 */
exports.getEarningsSummary = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const conversionRate = 0.10; // 10 coins = 1 INR

    // Get lifetime earnings
    const [lifetimeRows] = await pool.query(`SELECT SUM(coins) as total FROM coin_transactions WHERE user_id = ? AND type IN ('call_earn', 'chat_earn')`, [creatorId]);
    const lifetimeCoins = lifetimeRows[0].total || 0;

    // Get current month earnings
    const [monthRows] = await pool.query(`SELECT SUM(coins) as total FROM coin_transactions WHERE user_id = ? AND type IN ('call_earn', 'chat_earn') AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`, [creatorId]);
    const monthCoins = monthRows[0].total || 0;

    // Get current wallet balance
    const [walletRows] = await pool.query(`SELECT coin_balance FROM wallets WHERE user_id = ?`, [creatorId]);
    const currentCoins = walletRows.length > 0 ? parseFloat(walletRows[0].coin_balance) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        lifetime_earnings_coins: parseInt(lifetimeCoins),
        lifetime_earnings_inr: parseFloat((lifetimeCoins * conversionRate).toFixed(2)),
        this_month_earnings_coins: parseInt(monthCoins),
        this_month_earnings_inr: parseFloat((monthCoins * conversionRate).toFixed(2)),
        available_balance_coins: parseInt(currentCoins),
        available_balance_inr: parseFloat((currentCoins * conversionRate).toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.7 Save/Update Bank Details
 */
exports.saveBankDetails = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { account_holder_name, account_number, ifsc_code, bank_name } = req.body;

    if (!account_holder_name || !account_number || !ifsc_code) {
      return res.status(400).json({ status: 'error', message: 'Missing required bank details' });
    }

    await pool.query(`
      INSERT INTO bank_accounts (user_id, account_holder_name, account_number, ifsc_code, bank_name)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE account_holder_name = ?, account_number = ?, ifsc_code = ?, bank_name = ?
    `, [creatorId, account_holder_name, account_number, ifsc_code, bank_name || '', account_holder_name, account_number, ifsc_code, bank_name || '']);

    res.status(200).json({ status: 'success', message: 'Bank details saved successfully.' });
  } catch (error) {
    console.error('Error saving bank details:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.8 Get Bank Details
 */
exports.getBankDetails = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const [rows] = await pool.query(`SELECT account_holder_name, account_number, ifsc_code, bank_name FROM bank_accounts WHERE user_id = ?`, [creatorId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No bank details found' });
    }

    res.status(200).json({ status: 'success', data: rows[0] });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.9 Submit Withdrawal Request
 */
exports.submitWithdrawal = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { amount_inr } = req.body;
    const conversionRate = 0.10; // 10 coins = 1 INR (so 1 INR = 10 coins)
    const requiredCoins = amount_inr / conversionRate;

    // Check if they have a bank account
    const [bankRows] = await pool.query(`SELECT id FROM bank_accounts WHERE user_id = ?`, [creatorId]);
    if (bankRows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Please add bank details before withdrawing.' });
    }

    // Deduct from wallet safely
    const [updateRes] = await pool.query(`UPDATE wallets SET coin_balance = coin_balance - ? WHERE user_id = ? AND coin_balance >= ?`, [requiredCoins, creatorId, requiredCoins]);
    
    if (updateRes.affectedRows === 0) {
      return res.status(400).json({ status: 'error', message: 'Insufficient coin balance.' });
    }

    // Log transaction
    await pool.query(`INSERT INTO coin_transactions (user_id, type, coins) VALUES (?, 'withdrawal', -?)`, [creatorId, requiredCoins]);

    // Create withdrawal request
    await pool.query(`INSERT INTO withdrawal_requests (user_id, amount_inr, status) VALUES (?, ?, 'pending')`, [creatorId, amount_inr]);

    res.status(200).json({ status: 'success', message: 'Withdrawal request submitted successfully.' });
  } catch (error) {
    console.error('Error submitting withdrawal:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.10 Get Withdrawal History
 */
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const [rows] = await pool.query(`SELECT id AS request_id, amount_inr, status, created_at AS requested_at FROM withdrawal_requests WHERE user_id = ? ORDER BY created_at DESC`, [creatorId]);
    
    res.status(200).json({ status: 'success', data: rows });
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
