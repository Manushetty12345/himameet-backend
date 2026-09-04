const express = require('express');
const router = express.Router();
const db = require('../db');

// ⚠️ TEMPORARY ADMIN ENDPOINT — DELETE AFTER USE
// GET /api/admin/delete-user?phone=8088591796&secret=hima_admin_2026
router.get('/delete-user', async (req, res) => {
  const { phone, secret } = req.query;

  // Simple secret key guard so random people can't call this
  if (secret !== 'hima_admin_2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!phone) {
    return res.status(400).json({ error: 'phone query param required' });
  }

  try {
    // Delete OTP records
    const [otpRows] = await db.query(
      'DELETE FROM otp_verifications WHERE phone_number = $1',
      [phone]
    );

    // Find the user
    const [users] = await db.query(
      'SELECT id, phone_number, full_name, gender FROM users WHERE phone_number = $1',
      [phone]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        message: `No user found with phone: ${phone}`,
        otp_records_deleted: otpRows?.rowCount ?? 0,
      });
    }

    const user = users[0];

    // Delete user — CASCADE handles: wallets, sessions, notifications, etc.
    await db.query('DELETE FROM users WHERE id = $1', [user.id]);

    return res.json({
      success: true,
      message: `User ${phone} and all related records deleted successfully.`,
      deleted_user: user,
    });
  } catch (err) {
    console.error('Admin delete error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
