const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/authMiddleware');

// 4.1 Get Home Feed (Creator List)
router.get('/creators', protect, feedController.getCreators);

// 4.2 Random Match
router.post('/random-match', protect, feedController.randomMatch);

module.exports = router;
