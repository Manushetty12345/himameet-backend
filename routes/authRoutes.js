const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/truecaller', authController.truecallerLogin);
router.post('/logout', authController.logout);

router.get('/check-session', authController.checkSession);

module.exports = router;

