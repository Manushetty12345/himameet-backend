const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');

// 10.7 Create Support Ticket
router.post('/tickets', protect, supportController.createTicket);

// 10.7 Get Support Tickets
router.get('/tickets', protect, supportController.getTickets);

module.exports = router;
