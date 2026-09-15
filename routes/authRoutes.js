const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/truecaller', authController.truecallerLogin);
router.post('/logout', authController.logout);

router.get('/check-session', authController.checkSession);


router.get('/public/debug', async (req, res) => {
  try {
    const pool = require('../db');
    const { rows: convs } = await pool.query(`
      SELECT c.id, c.user_one_id, c.user_two_id, c.last_message_id, m.message_text 
      FROM conversations c
      LEFT JOIN messages m ON m.id = c.last_message_id
      ORDER BY c.created_at DESC
      LIMIT 20
    `);
    res.json({ convs });
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;

