const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'voice_' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
const onboardingController = require('../controllers/onboardingController');
const { protect } = require('../middleware/authMiddleware');

// Public endpoints (no token needed to view available avatars, languages, interests)
router.get('/avatars', onboardingController.getAvatars);
router.get('/languages', onboardingController.getLanguages);
router.get('/interests', onboardingController.getInterests);
router.get('/voice-sentence', onboardingController.getVoiceSentence);

// Protected endpoint (requires the temp_token)
// The api_list.md says /user/profile-setup, so we will map it appropriately in index.js
router.post('/profile-setup', protect, onboardingController.saveProfileSetup);



router.post('/submit-creator-application', protect, upload.single('voice_sample'), onboardingController.submitCreatorApplication);

module.exports = router;









