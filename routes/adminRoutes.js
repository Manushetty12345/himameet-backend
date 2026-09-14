const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

// Admin middleware - checks is_admin flag from JWT
const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ status: 'error', message: 'Admin access only' });
  }
  next();
};

// One-time setup: create first admin (only works if NO admin exists yet)
router.post('/setup', adminController.setupFirstAdmin);

// Public - OTP Login (2 steps)
router.post('/send-otp', adminController.sendAdminOtp);
router.post('/verify-otp', adminController.verifyAdminOtp);

// All routes below require admin auth
router.use(protect, adminOnly);

// Overview
router.get('/overview', adminController.getOverview);
router.get('/revenue-chart', adminController.getRevenueChart);

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:userId/status', adminController.updateUserStatus);

// Global Settings
router.get('/global-rates', adminController.getGlobalRates);
router.put('/global-rates', adminController.updateGlobalRates);


// Creator Applications
router.get('/applications', adminController.getCreatorApplications);
router.put('/applications/:applicationId/review', adminController.reviewApplication);

// Withdrawals
router.get('/withdrawals', adminController.getWithdrawals);
router.put('/withdrawals/:withdrawalId/process', adminController.processWithdrawal);

// Reports
router.get('/reports', adminController.getReports);
router.put('/reports/:reportId/resolve', adminController.resolveReport);

// Support
router.get('/tickets', adminController.getTickets);
router.get('/tickets/:ticketId/messages', adminController.getTicketMessages);
router.put('/tickets/:ticketId/reply', adminController.replyTicket);
router.put('/tickets/:ticketId/close', adminController.closeTicket);

// Packages
router.get('/packages', adminController.getPackages);
router.post('/packages', adminController.createPackage);
router.put('/packages/:id', adminController.updatePackage);
router.delete('/packages/:id', adminController.deletePackage);

// Call Logs
router.get('/call-logs', adminController.getCallLogs);

module.exports = router;
