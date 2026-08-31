const express = require('express');
const router = express.Router();
const creatorOnboardingController = require('../controllers/creatorOnboardingController');
const creatorProfileController = require('../controllers/creatorProfileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ==========================================
// Section 3: Creator Profile Setup (Onboarding)
// ==========================================
router.get('/onboarding/interests', creatorOnboardingController.getInterests);
router.get('/onboarding/voice-sentence', creatorOnboardingController.getVoiceSentence);
router.post('/creator/application/submit', protect, upload.single('voice_recording'), creatorOnboardingController.submitApplication);

// ==========================================
// Section 6: Creator Profile & Actions
// ==========================================
// 6.1 Get Creator Profile
router.get('/creator/:creator_id/profile', protect, creatorProfileController.getProfile);

// 6.2 Notify Me When Online
router.post('/creator/:creator_id/notify-online', protect, creatorProfileController.notifyOnline);

// 6.3 Report User
router.post('/creator/:creator_id/report', protect, creatorProfileController.reportUser);

// 6.4 Block User
router.post('/creator/:creator_id/block', protect, creatorProfileController.blockUser);


router.get('/creator/profile/settings', protect, creatorProfileController.getProfileSettings);
router.put('/creator/profile/edit', protect, creatorProfileController.updateCreatorProfile);
module.exports = router;
