const pool = require('../db');
const jwt = require('jsonwebtoken');
const bhashsms = require('../utils/bhashsms');

const JWT_SECRET = process.env.JWT_SECRET;

// ─── One-Time Setup: Create First Admin ──────────────────────────────────────
// Only works if NO admin exists in the database yet (safe to leave in code)
exports.setupFirstAdmin = async (req, res) => {
  try {
    const { phone_number, secret_key } = req.body;

    // Basic secret to prevent random people from calling this
    if (secret_key !== 'HIMAMEET_ADMIN_SETUP') {
      return res.status(403).json({ status: 'error', message: 'Invalid setup key' });
    }

    if (!phone_number) {
      return res.status(400).json({ status: 'error', message: 'Phone number required' });
    }

    // Block if admin already exists
    const [existingAdmins] = await pool.query(`SELECT id FROM users WHERE is_admin = true`);
    if (existingAdmins.length > 0) {
      return res.status(403).json({ status: 'error', message: 'Admin already exists. Cannot run setup again.' });
    }

    // Try multiple formats: as-entered, without +91, with +91
    const formats = [
      phone_number,
      phone_number.replace(/^\+91/, ''),        // strip +91 → 10 digits
      phone_number.replace(/^91/, ''),           // strip 91 → 10 digits
      '+91' + phone_number.replace(/^\+?91?/, '') // ensure +91 prefix
    ];

    let updated = [];
    for (const fmt of formats) {
      const [rows] = await pool.query(
        `UPDATE users SET is_admin = true WHERE phone_number = $1 RETURNING id, full_name, phone_number`,
        [fmt]
      );
      if (rows.length > 0) { updated = rows; break; }
    }

    if (updated.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Phone number not found. Make sure this number is registered in the app first.' });
    }

    console.log(`[setupFirstAdmin] ✅ Admin created: ${phone_number}`);
    res.json({ status: 'success', message: `✅ ${phone_number} is now an admin! You can now login with OTP.`, admin: updated[0] });
  } catch (err) {
    console.error('[setupFirstAdmin] Error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// ─── Admin Send OTP ───────────────────────────────────────────────────────────
exports.sendAdminOtp = async (req, res) => {
  try {
    const { phone_number } = req.body;
    if (!phone_number) return res.status(400).json({ status: 'error', message: 'Phone number required' });

    // Try multiple phone number formats
    const formats = [
      phone_number,
      phone_number.replace(/^\+91/, ''),
      '+91' + phone_number.replace(/^\+?91?/, '')
    ];

    let admin = null;
    for (const fmt of formats) {
      const [rows] = await pool.query(`SELECT id FROM users WHERE phone_number = $1 AND is_admin = true`, [fmt]);
      if (rows.length > 0) { admin = rows[0]; break; }
    }

    if (!admin) {
      return res.status(403).json({ status: 'error', message: 'Not an admin account' });
    }

    // Strip country code for bhashsms (expects 10-digit mobile)
    const mobile = phone_number.replace(/^\+91/, '').replace(/^91/, '').slice(-10);
    await bhashsms.sendOTP(mobile, '91');

    res.json({ status: 'success', message: 'OTP sent to your number' });
  } catch (err) {
    console.error('[sendAdminOtp] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};


// ─── Admin Verify OTP ─────────────────────────────────────────────────────────
exports.verifyAdminOtp = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;
    if (!phone_number || !otp) return res.status(400).json({ status: 'error', message: 'Phone and OTP required' });

    // Verify OTP
    const mobile = phone_number.replace(/^\+91/, '');
    const result = bhashsms.verifyOTP(mobile, '91', otp);
    if (result.type !== 'success') {
      return res.status(400).json({ status: 'error', message: result.message || 'Invalid OTP' });
    }

    // Get admin user
    const [rows] = await pool.query(`SELECT * FROM users WHERE phone_number = $1 AND is_admin = true`, [phone_number]);
    if (rows.length === 0) {
      return res.status(403).json({ status: 'error', message: 'Not an admin account' });
    }

    const admin = rows[0];
    const token = jwt.sign({ id: admin.id, is_admin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      status: 'success',
      token,
      admin: { id: admin.id, full_name: admin.full_name, phone_number: admin.phone_number }
    });
  } catch (err) {
    console.error('[verifyAdminOtp] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// ─── Dashboard Overview ────────────────────────────────────────────────────────
exports.getOverview = async (req, res) => {
  try {
    const [[totalUsers]] = await pool.query(`SELECT COUNT(*) as count FROM users WHERE is_admin = false OR is_admin IS NULL`);
    const [[totalCreators]] = await pool.query(`SELECT COUNT(*) as count FROM users WHERE user_role = 'creator'`);
    const [[maleCount]] = await pool.query(`SELECT COUNT(*) as count FROM users WHERE gender = 'male'`);
    const [[femaleCount]] = await pool.query(`SELECT COUNT(*) as count FROM users WHERE gender = 'female'`);
    const [[pendingApplications]] = await pool.query(`SELECT COUNT(*) as count FROM creator_applications WHERE status = 'pending_review'`);
    const [[pendingWithdrawals]] = await pool.query(`SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = 'pending'`);
    const [[openTickets]] = await pool.query(`SELECT COUNT(*) as count FROM support_tickets WHERE status = 'active'`);
    const [[pendingReports]] = await pool.query(`SELECT COUNT(*) as count FROM user_reports WHERE status = 'pending'`);

    const [[todayRevenue]] = await pool.query(`
      SELECT COALESCE(SUM(coins), 0) as total_coins, COALESCE(SUM(amount_paid), 0) as total_inr FROM coin_transactions 
      WHERE type = 'purchase' AND DATE(created_at) = CURRENT_DATE
    `);
    const [[monthRevenue]] = await pool.query(`
      SELECT COALESCE(SUM(coins), 0) as total_coins, COALESCE(SUM(amount_paid), 0) as total_inr FROM coin_transactions 
      WHERE type = 'purchase' AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    const [[totalRevenue]] = await pool.query(`
      SELECT COALESCE(SUM(coins), 0) as total_coins, COALESCE(SUM(amount_paid), 0) as total_inr FROM coin_transactions WHERE type = 'purchase'
    `);
    const [[pendingWithdrawAmount]] = await pool.query(`
      SELECT COALESCE(SUM(amount_inr), 0) as total FROM withdrawal_requests WHERE status = 'pending'
    `);
    const [[activeCalls]] = await pool.query(`
      SELECT COUNT(*) as count FROM call_logs WHERE status = 'ongoing'
    `);

    res.json({
      status: 'success',
      data: {
        total_users: parseInt(totalUsers.count),
        total_creators: parseInt(totalCreators.count),
        male_count: parseInt(maleCount.count),
        female_count: parseInt(femaleCount.count),
        pending_applications: parseInt(pendingApplications.count),
        pending_withdrawals: parseInt(pendingWithdrawals.count),
        open_tickets: parseInt(openTickets.count),
        pending_reports: parseInt(pendingReports.count),
        today_revenue_coins: parseInt(todayRevenue.total_coins),
        today_revenue_inr: parseFloat(todayRevenue.total_inr),
        month_revenue_coins: parseInt(monthRevenue.total_coins),
        month_revenue_inr: parseFloat(monthRevenue.total_inr),
        total_revenue_coins: parseInt(totalRevenue.total_coins),
        total_revenue_inr: parseFloat(totalRevenue.total_inr),
        pending_withdrawal_amount: parseFloat(pendingWithdrawAmount.total),
        active_calls: parseInt(activeCalls.count),
      }
    });
  } catch (err) {
    console.error('[getOverview] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// ─── Users ─────────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';

    let conditions = [`(u.is_admin = false OR u.is_admin IS NULL)`, `(u.user_role != 'creator' OR u.is_verified = true)`];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.full_name ILIKE $${idx} OR u.phone_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (role) {
      conditions.push(`u.user_role = $${idx}`);
      params.push(role);
      idx++;
    }
    if (status) {
      conditions.push(`u.account_status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [users] = await pool.query(`
      SELECT u.id, u.full_name, u.phone_number, u.gender, u.user_role, u.account_status,
             u.created_at, u.is_online, u.age,
             w.coin_balance,
             a.avatar_url
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN avatars a ON u.avatar_id = a.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);

    const [[{ count }]] = await pool.query(`
      SELECT COUNT(*) as count FROM users u ${where}
    `, params);

    res.json({ status: 'success', data: users, total: parseInt(count), page, limit });
  } catch (err) {
    console.error('[getUsers] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.updateUserStatus = async (req, res) => {
    try {
      const { userId } = req.params;
      const { account_status, reason } = req.body;
  
      const valid = ['good_standing', 'warned', 'suspended', 'banned'];
      if (!valid.includes(account_status)) {
        return res.status(400).json({ status: 'error', message: 'Invalid status' });
      }

      // If issuing a warning, insert it into user_warnings table
      if (account_status === 'warned') {
        const warningReason = reason || 'Violated Community Guidelines';
        await pool.query(
          `INSERT INTO user_warnings (user_id, reason, issued_by_admin_id) VALUES ($1, $2, $3)`,
          [userId, warningReason, req.admin ? req.admin.id : null]
        );
      } else if (account_status === 'good_standing') {
        // Clear all warnings if user is restored
        await pool.query(`DELETE FROM user_warnings WHERE user_id = $1`, [userId]);
      }

      await pool.query(`UPDATE users SET account_status = $1 WHERE id = $2`, [account_status, userId]);
    res.json({ status: 'success', message: `User status updated to ${account_status}` });
  } catch (err) {
    console.error('[updateUserStatus] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// ─── Creator Applications ──────────────────────────────────────────────────────
exports.getCreatorApplications = async (req, res) => {
  try {
    const status = req.query.status || 'pending_review';
    const [apps] = await pool.query(`
      SELECT ca.*, u.full_name, u.phone_number, u.gender, u.age,
             a.avatar_url
      FROM creator_applications ca
      JOIN users u ON ca.user_id = u.id
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE ca.status = $1
      ORDER BY ca.submitted_at DESC
    `, [status]);

    res.json({ status: 'success', data: apps });
  } catch (err) {
    console.error('[getCreatorApplications] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.reviewApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action, rejection_reason } = req.body; // action: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Invalid action' });
    }

    const [appRows] = await pool.query(`SELECT * FROM creator_applications WHERE id = $1`, [applicationId]);
    if (appRows.length === 0) return res.status(404).json({ status: 'error', message: 'Application not found' });

    const app = appRows[0];

    await pool.query(`
      UPDATE creator_applications SET status = $1, rejection_reason = $2, reviewed_at = NOW(), reviewed_by_admin_id = $3
      WHERE id = $4
    `, [action, rejection_reason || null, req.user.id, applicationId]);

    if (action === 'approved') {
        await pool.query(`UPDATE users SET user_role = 'creator', is_verified = true WHERE id = $1`, [app.user_id]);
        
        // Fetch default rates
        const [settingsRows] = await pool.query(`SELECT key, value FROM settings WHERE key IN ('default_voice_rate', 'default_video_rate')`);
        let voiceRate = 20;
        let videoRate = 40;
        for (const row of settingsRows) {
          if (row.key === 'default_voice_rate') voiceRate = parseInt(row.value, 10);
          if (row.key === 'default_video_rate') videoRate = parseInt(row.value, 10);
        }
        
        // Create or update creator_settings
        await pool.query(`
          INSERT INTO creator_settings (user_id, voice_rate_per_min, video_rate_per_min) 
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id) DO NOTHING
        `, [app.user_id, voiceRate, videoRate]);
      }

    res.json({ status: 'success', message: `Application ${action}` });
  } catch (err) {
    console.error('[reviewApplication] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// ─── Withdrawal Requests ───────────────────────────────────────────────────────
exports.getWithdrawals = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const [rows] = await pool.query(`
      SELECT wr.*, u.full_name, u.phone_number,
             ba.account_holder_name, ba.account_number, ba.ifsc_code, ba.passbook_photo_url,
             ba.pan_number, ba.pan_photo_url, ba.upi_id, ba.phone_number as bank_phone
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      LEFT JOIN bank_accounts ba ON wr.user_id = ba.user_id
      WHERE wr.status = $1
      ORDER BY wr.requested_at DESC
    `, [status]);

    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[getWithdrawals] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.processWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { action, admin_notes } = req.body; // action: 'success' | 'failed'

    if (!['success', 'failed'].includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Invalid action' });
    }

    const [rows] = await pool.query(`SELECT * FROM withdrawal_requests WHERE id = $1`, [withdrawalId]);
    if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'Request not found' });

    const wr = rows[0];

    await pool.query(`
      UPDATE withdrawal_requests SET status = $1, admin_notes = $2, processed_at = NOW()
      WHERE id = $3
    `, [action, admin_notes || null, withdrawalId]);

    // If failed, refund coins to the creator's wallet
    if (action === 'failed') {
      const refundCoins = Math.round(wr.amount_inr * 10);
      await pool.query(`UPDATE wallets SET coin_balance = coin_balance + $1 WHERE user_id = $2`, [refundCoins, wr.user_id]);
      await pool.query(`INSERT INTO coin_transactions (user_id, type, coins) VALUES ($1, 'refund', $2)`, [wr.user_id, refundCoins]);
    }

    res.json({ status: 'success', message: `Withdrawal marked as ${action}` });
  } catch (err) {
    console.error('[processWithdrawal] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// ─── Reports ───────────────────────────────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ur.*, 
             reporter.full_name as reporter_name, reporter.phone_number as reporter_phone,
             reported.full_name as reported_name, reported.phone_number as reported_phone,
             reported.account_status
      FROM user_reports ur
      JOIN users reporter ON ur.reporter_id = reporter.id
      JOIN users reported ON ur.reported_id = reported.id
      WHERE ur.status = 'pending'
      ORDER BY ur.created_at DESC
    `);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[getReports] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, reported_user_id } = req.body; // action: 'warn' | 'ban' | 'dismiss'

    await pool.query(`UPDATE user_reports SET status = 'reviewed' WHERE id = $1`, [reportId]);

    if (action === 'warn') {
      await pool.query(`UPDATE users SET account_status = 'warned' WHERE id = $1`, [reported_user_id]);
    } else if (action === 'ban') {
      await pool.query(`UPDATE users SET account_status = 'banned' WHERE id = $1`, [reported_user_id]);
    }

    res.json({ status: 'success', message: `Report resolved` });
  } catch (err) {
    console.error('[resolveReport] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// ─── Support Tickets ───────────────────────────────────────────────────────────
exports.getTickets = async (req, res) => {
  try {
    const statusFilter = req.query.status || 'active';
      const [rows] = await pool.query(`
        SELECT st.*, u.full_name, u.phone_number
        FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      WHERE st.status = $1
      ORDER BY st.created_at DESC
      `, [statusFilter]);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[getTickets] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};


exports.getTicketMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const [rows] = await pool.query(`
      SELECT id, sender_type, message, created_at 
      FROM support_ticket_messages 
      WHERE ticket_id = $1 
      ORDER BY created_at ASC
    `, [ticketId]);

    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[getTicketMessages] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.replyTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    const [rows] = await pool.query(`
      INSERT INTO support_ticket_messages (ticket_id, sender_type, message)
      VALUES ($1, 'admin', $2) RETURNING *
    `, [ticketId, message]);

    res.json({ status: 'success', message: 'Reply sent', data: rows[0] });
  } catch (err) {
    console.error('[replyTicket] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    await pool.query(`UPDATE support_tickets SET status = 'resolved', resolved_at = NOW() WHERE id = $1`, [ticketId]);
    res.json({ status: 'success', message: 'Ticket closed' });
  } catch (err) {
    console.error('[closeTicket] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// ─── Revenue Chart ─────────────────────────────────────────────────────────────
exports.getRevenueChart = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DATE(created_at) as date, COALESCE(SUM(coins), 0) as coins, COALESCE(SUM(amount_paid), 0) as inr
      FROM coin_transactions
      WHERE type = 'purchase' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[getRevenueChart] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// ─── Call Logs ─────────────────────────────────────────────────────────────────
exports.getCallLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(`
      SELECT cl.id, cl.call_type, cl.status, cl.duration_seconds, cl.coins_charged, cl.created_at,
             caller.full_name as caller_name, caller.phone_number as caller_phone,
             receiver.full_name as receiver_name, receiver.phone_number as receiver_phone
      FROM call_logs cl
      JOIN users caller ON cl.caller_id = caller.id
      JOIN users receiver ON cl.receiver_id = receiver.id
      ORDER BY cl.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[getCallLogs] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};



// --- Coin Packages (Admin) ----------------------------------------------------
exports.getPackages = async (req, res) => {
  try {
    const [packages] = await pool.query(`SELECT * FROM coin_packages ORDER BY display_order ASC, price ASC`);
    res.json({ status: "success", data: packages });
  } catch (err) {
    console.error("[getPackages] Error:", err);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

exports.createPackage = async (req, res) => {
  try {
    const { coins, price, original_price, discount_percent, is_welcome_offer, is_active, display_order } = req.body;
    const [result] = await pool.query(`
      INSERT INTO coin_packages (coins, price, original_price, discount_percent, is_welcome_offer, is_active, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [coins, price, original_price || null, discount_percent || 0, is_welcome_offer || false, is_active ?? true, display_order || 0]);
    res.json({ status: "success", data: result[0] });
  } catch (err) {
    console.error("[createPackage] Error:", err);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { coins, price, original_price, discount_percent, is_welcome_offer, is_active, display_order } = req.body;
    const [result] = await pool.query(`
      UPDATE coin_packages 
      SET coins = $1, price = $2, original_price = $3, discount_percent = $4, is_welcome_offer = $5, is_active = $6, display_order = $7
      WHERE id = $8 RETURNING *
    `, [coins, price, original_price || null, discount_percent || 0, is_welcome_offer || false, is_active ?? true, display_order || 0, id]);
    res.json({ status: "success", data: result[0] });
  } catch (err) {
    console.error("[updatePackage] Error:", err);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM coin_packages WHERE id = $1`, [id]);
    res.json({ status: "success", message: "Package deleted" });
  } catch (err) {
    console.error("[deletePackage] Error:", err);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

exports.updateCreatorRates = async (req, res) => {
  try {
    const { userId } = req.params;
    const { voice_rate_per_min, video_rate_per_min } = req.body;
    
    // UPSERT into creator_settings
    await pool.query(`
      INSERT INTO creator_settings (user_id, voice_rate_per_min, video_rate_per_min) 
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE 
      SET voice_rate_per_min = EXCLUDED.voice_rate_per_min, video_rate_per_min = EXCLUDED.video_rate_per_min, updated_at = NOW()
    `, [userId, voice_rate_per_min, video_rate_per_min]);
    
    res.json({ status: 'success', message: 'Rates updated successfully' });
  } catch (err) {
    console.error('[updateCreatorRates] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getGlobalRates = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT key, value FROM settings WHERE key IN ('default_voice_rate', 'default_video_rate')`);
    let voiceRate = 20;
    let videoRate = 40;
    
    for (const row of rows) {
      if (row.key === 'default_voice_rate') voiceRate = parseInt(row.value, 10);
      if (row.key === 'default_video_rate') videoRate = parseInt(row.value, 10);
    }
    
    res.json({ status: 'success', data: { voice_rate_per_min: voiceRate, video_rate_per_min: videoRate } });
  } catch (err) {
    console.error('[getGlobalRates] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.updateGlobalRates = async (req, res) => {
  try {
    const { voice_rate_per_min, video_rate_per_min } = req.body;
    
    // Save to settings table
    await pool.query(`
      INSERT INTO settings (key, value, description) VALUES ('default_voice_rate', $1, 'Global voice rate for female creators')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [voice_rate_per_min.toString()]);
    
    await pool.query(`
      INSERT INTO settings (key, value, description) VALUES ('default_video_rate', $1, 'Global video rate for female creators')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [video_rate_per_min.toString()]);
    
    // Immediately apply to all existing creators
    await pool.query(`
      UPDATE creator_settings SET voice_rate_per_min = $1, video_rate_per_min = $2
    `, [voice_rate_per_min, video_rate_per_min]);
    
    res.json({ status: 'success', message: 'Global rates updated successfully' });
  } catch (err) {
    console.error('[updateGlobalRates] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
