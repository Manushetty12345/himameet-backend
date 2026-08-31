const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

// 8.1 Initiate Call
router.post('/initiate', protect, callController.initiateCall);

// 8.2 End Call
router.post('/end', protect, callController.endCall);

// 9.1 Get Call History
// Note: This route is mounted under /api/calls in index.js to match the spec
router.get('/history', protect, callController.getHistory);

router.post('/:call_id/accept', protect, callController.acceptCall);
router.post('/:call_id/reject', protect, callController.rejectCall);
module.exports = router;
