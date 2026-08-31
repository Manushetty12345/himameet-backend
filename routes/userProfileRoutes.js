const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfileController');
const { protect } = require('../middleware/authMiddleware');

// 10.1 Get My Profile (Settings View)
router.get('/me', protect, userProfileController.getMyProfile);

// 10.2 Edit Profile
router.put('/profile', protect, userProfileController.editProfile);

// 10.3 Get Transactions
router.get('/transactions', protect, userProfileController.getTransactions);

// 10.4 Get Referral Stats
router.get('/referral', protect, userProfileController.getReferralStats);

// 10.5 Toggle DND
router.post('/dnd', protect, userProfileController.toggleDnd);

// 10.6 Get Admin Warnings
router.get('/warnings', protect, userProfileController.getWarnings);

// 10.8 Delete Account
router.post('/delete-account', protect, userProfileController.deleteAccount);

// 10.10 Get In-App Notifications
router.get('/notifications', protect, userProfileController.getNotifications);

module.exports = router;
