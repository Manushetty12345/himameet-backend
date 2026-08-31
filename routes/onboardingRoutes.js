const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { protect } = require('../middleware/authMiddleware');

// Public endpoints (no token needed to view available avatars and languages)
router.get('/avatars', onboardingController.getAvatars);
router.get('/languages', onboardingController.getLanguages);

// Protected endpoint (requires the temp_token)
// The api_list.md says /user/profile-setup, so we will map it appropriately in index.js
router.post('/profile-setup', protect, onboardingController.saveProfileSetup);

module.exports = router;
