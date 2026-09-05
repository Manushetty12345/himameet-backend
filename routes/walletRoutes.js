const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

// 5.0 Get Wallet Balance
router.get('/balance', protect, walletController.getBalance);

// 5.1 Get Coin Packages
router.get('/packages', protect, walletController.getPackages);

// 5.2 Initiate Recharge (PhonePe)
router.post('/recharge/initiate', protect, walletController.initiateRecharge);

// 5.3 PhonePe Webhook (Server-to-Server)
// Notice this is NOT protected by our JWT middleware because PhonePe sends it, not the user's phone!
router.post('/recharge/webhook', walletController.phonepeWebhook);

// 5.4 Check Payment Status
router.get('/recharge/status/:transaction_id', protect, walletController.checkPaymentStatus);


// 5.5 PhonePe Redirect (Callback)
// Handles the redirect after successful/failed payment in web view
router.post('/recharge/redirect', walletController.phonepeRedirect);
router.get('/recharge/redirect', walletController.phonepeRedirect);

// 5.6 Verify Recharge Payment (called by frontend after WebView)
router.post('/recharge/verify', protect, walletController.verifyRechargePayment);

module.exports = router;

