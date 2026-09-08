const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

// 7.1 Send Friend Request
router.post('/request', protect, friendController.sendRequest);

// 7.2 Get Friends Lists
router.get('/list', protect, friendController.getFriends);
router.get('/favourites', protect, friendController.getFavourites);
router.get('/requests/received', protect, friendController.getRequestsReceived);
router.get('/requests/sent', protect, friendController.getRequestsSent);

// 7.3 Toggle Favourite
router.post('/:friend_id/favourite', protect, friendController.toggleFavourite);

// 7.4 Check Friend Status
router.get('/status/:target_user_id', protect, friendController.checkStatus);

// 7.5 Cancel Friend Request
router.post('/cancel', protect, friendController.cancelRequest);

// 7.6 Accept Friend Request
router.post('/accept', protect, friendController.acceptRequest);

// 7.7 Remove Friend
router.post('/remove', protect, friendController.removeFriend);

// 7.8 Block User
router.post('/block', protect, friendController.blockUser);

module.exports = router;
