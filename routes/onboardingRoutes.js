const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { protect } = require('../middleware/authMiddleware');

// Public endpoints (no token needed to view available avatars, languages, interests)
router.get('/avatars', onboardingController.getAvatars);
router.get('/languages', onboardingController.getLanguages);
router.get('/interests', onboardingController.getInterests);

// Protected endpoint (requires the temp_token)
// The api_list.md says /user/profile-setup, so we will map it appropriately in index.js
router.post('/profile-setup', protect, onboardingController.saveProfileSetup);


// ===== TEMP WIPE ROUTE - DELETE AFTER RUNNING ONCE =====
router.get('/wipe-database-danger', async (req, res) => {
  const pool = require('../db');
  try {
    const [rows] = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const tablesToKeep = ['languages', 'tags', 'avatars', 'admin_users'];
    const tablesToWipe = rows
      .map(r => r.tablename)
      .filter(t => !tablesToKeep.includes(t));

    for (const table of tablesToWipe) {
      await pool.query("TRUNCATE TABLE \"" + table + "\" CASCADE");
    }

    res.json({ success: true, wiped: tablesToWipe, message: 'All user data has been cleared.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;





