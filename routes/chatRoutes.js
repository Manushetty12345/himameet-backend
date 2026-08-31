const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// 7.4 Clear Chat
router.post('/:chat_id/clear', protect, chatController.clearChat);
router.delete('/:chat_id', protect, chatController.clearChat);

// 7.5 Get Chat Messages
router.get('/:chat_id/messages', protect, chatController.getMessages);

module.exports = router;
