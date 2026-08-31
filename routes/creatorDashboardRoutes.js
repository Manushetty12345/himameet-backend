const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/creatorDashboardController');
const { protect } = require('../middleware/authMiddleware');

// 11.1 Get Dashboard Home
router.get('/dashboard/home', protect, dashboardController.getDashboardHome);

// 11.2 Toggle Online Status
router.post('/dashboard/status', protect, dashboardController.toggleStatus);

// 11.5 Get Creator Call History
router.get('/calls/history', protect, dashboardController.getCreatorCallHistory);


router.get('/earnings/summary', protect, dashboardController.getEarningsSummary);
router.post('/bank-details', protect, dashboardController.saveBankDetails);
router.get('/bank-details', protect, dashboardController.getBankDetails);
router.post('/withdraw', protect, dashboardController.submitWithdrawal);
router.get('/withdrawals', protect, dashboardController.getWithdrawalHistory);
module.exports = router;
