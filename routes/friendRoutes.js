const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

// 7.1 Send Friend Request
router.post('/request', protect, friendController.sendRequest);

// 7.2 Get Friends Lists
router.get('/list', protect, friendController.getFriends);

// 7.3 Toggle Favourite
router.post('/:friend_id/favourite', protect, friendController.toggleFavourite);

module.exports = router;
