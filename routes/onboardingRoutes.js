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

module.exports = router;

// ===== TEMP SEED ROUTE - DELETE AFTER RUNNING ONCE =====
router.get('/seed-tamil-female', async (req, res) => {
  const pool = require('../db');
  const client = await pool.connect();
  try {
    // 1. Get Tamil language ID
    const langRes = await client.query("SELECT id FROM languages WHERE name_english ILIKE 'Tamil' LIMIT 1");
    if (langRes.rows.length === 0) return res.status(404).json({ error: 'Tamil language not found in DB' });
    const langId = langRes.rows[0].id;

    // 2. Get a female avatar ID
    const avatarRes = await client.query("SELECT id FROM avatars WHERE gender = 'female' LIMIT 1");
    if (avatarRes.rows.length === 0) return res.status(404).json({ error: 'No female avatar found in DB' });
    const avatarId = avatarRes.rows[0].id;

    // 3. Insert interests if not existing
    const interests = ['Music', 'Cooking', 'Politics', 'Art'];
    for (let i = 0; i < interests.length; i++) {
      await client.query(
        "INSERT INTO tags (name, tag_type, is_active, display_order) SELECT $1::text, 'interest', true, $2 WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = $1::text AND tag_type = 'interest')",
        [interests[i], i + 1]
      );
    }

    // 4. Insert female creator (Tamil)
    const userRes = await client.query(
      `INSERT INTO users (phone_number, country_code, full_name, user_role, gender, avatar_id, language_id, is_online, is_new_creator)
       VALUES ($1, '+91', 'Priya Tamil', 'creator', 'female', $2, $3, true, false)
       ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
      ['9000000099', avatarId, langId]
    );
    const newUserId = userRes.rows[0].id;

    // 5. Assign all interests to the user
    await client.query("DELETE FROM user_tags WHERE user_id = $1", [newUserId]);
    const tagRes = await client.query(
      "SELECT id FROM tags WHERE name = ANY($1) AND tag_type = 'interest'",
      [interests]
    );
    for (const tag of tagRes.rows) {
      await client.query(
        "INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [newUserId, tag.id]
      );
    }

    // 6. Add creator settings
    await client.query(
      `INSERT INTO creator_settings (user_id, voice_rate_per_min, video_rate_per_min, is_available)
       VALUES ($1, 10.00, 20.00, true)
       ON CONFLICT (user_id) DO UPDATE SET is_available = true`,
      [newUserId]
    );

    res.json({
      success: true,
      message: 'Tamil female creator seeded successfully!',
      user_id: newUserId,
      language_id: langId,
      avatar_id: avatarId,
      interests_added: interests
    });
  } catch (e) {
    console.error('Seed error:', e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});
// ===== END TEMP SEED ROUTE =====

