const pool = require('../db');

/**
 * 6.1 Get Creator Profile
 */
exports.getProfile = async (req, res) => {
  try {
    const creatorId = req.params.creator_id;
    const userId = req.user.id;

    const [userRows] = await pool.query(`
      SELECT 
        u.id AS creator_id,
        u.full_name AS name,
        u.age,
        u.about_me AS bio,
        a.avatar_url
      FROM users u
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE u.id = $1 AND u.user_role = 'creator'
    `, [creatorId]);

    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Creator not found' });
    }

    const creator = userRows[0];

    const [rateRows] = await pool.query(`SELECT voice_rate_per_min, video_rate_per_min FROM creator_settings WHERE user_id = $1`, [creatorId]);
    const rates = rateRows.length > 0 ? rateRows[0] : { voice_rate_per_min: 8, video_rate_per_min: 15 };

    const [tagRows] = await pool.query(`
      SELECT t.name 
      FROM user_tags ut
      JOIN tags t ON ut.tag_id = t.id
      WHERE ut.user_id = $1 AND t.tag_type = 'interest'
    `, [creatorId]);
    const interests = tagRows.map(row => row.name);

    const [langRows] = await pool.query(`
      SELECT l.name_english AS name 
      FROM users u
      JOIN languages l ON u.language_id = l.id
      WHERE u.id = $1
    `, [creatorId]);
    const languages = langRows.map(row => row.name);

    let friendshipStatus = 'none';
    const [friendRows] = await pool.query(`
      SELECT id FROM friendships 
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $3 AND user_two_id = $4)
    `, [userId, creatorId, creatorId, userId]);
    
    if (friendRows.length > 0) {
      friendshipStatus = 'friends';
    } else {
      const [reqRows] = await pool.query(`
        SELECT id FROM friend_requests 
        WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4)
      `, [userId, creatorId, creatorId, userId]);
      if (reqRows.length > 0) {
        friendshipStatus = 'pending';
      }
    }

    const [notifyRows] = await pool.query(`
      SELECT id FROM online_notify_subscriptions 
      WHERE subscriber_id = $1 AND target_user_id = $2
    `, [userId, creatorId]);

    res.status(200).json({
      status: 'success',
      data: {
        creator_id: creator.creator_id,
        name: creator.name,
        age: creator.age,
        avatar_url: creator.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-female.png',
        languages: languages,
        interests: interests,
        bio: creator.bio,
        call_rates: {
          voice: parseFloat(rates.voice_rate_per_min),
          video: parseFloat(rates.video_rate_per_min)
        },
        friendship_status: friendshipStatus,
        is_notify_online_enabled: notifyRows.length > 0
      }
    });

  } catch (error) {
    console.error('Error fetching creator profile:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 6.2 Notify Me When Online
 */
exports.notifyOnline = async (req, res) => {
  try {
    const creatorId = req.params.creator_id;
    const userId = req.user.id;
    const { enabled } = req.body;

    if (enabled) {
      await pool.query(`
        INSERT INTO online_notify_subscriptions (subscriber_id, target_user_id) 
        VALUES ($1, $2) ON CONFLICT (subscriber_id, target_user_id) DO NOTHING
      `, [userId, creatorId]);
    } else {
      await pool.query(`
        DELETE FROM online_notify_subscriptions 
        WHERE subscriber_id = $1 AND target_user_id = $2
      `, [userId, creatorId]);
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification preference updated.'
    });
  } catch (error) {
    console.error('Error updating notify online:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 6.3 Report User
 */
exports.reportUser = async (req, res) => {
  try {
    const creatorId = req.params.creator_id;
    const userId = req.user.id;
    const { reason, description } = req.body;

    await pool.query(`
      INSERT INTO user_reports (reporter_id, reported_id, reason, description) 
      VALUES ($1, $2, $3, $4)
    `, [userId, creatorId, reason, description]);

    res.status(200).json({
      status: 'success',
      message: 'User reported successfully.'
    });
  } catch (error) {
    console.error('Error reporting user:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 6.4 Block User
 */
exports.blockUser = async (req, res) => {
  try {
    const creatorId = req.params.creator_id;
    const userId = req.user.id;
    await pool.query("INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT (blocker_id, blocked_id) DO NOTHING", [userId, creatorId]);
    res.status(200).json({ status: 'success', message: 'User blocked.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.11 Get Profile Settings
 */
exports.getProfileSettings = async (req, res) => {
  try {
    const creatorId = req.user.id;

    const [userRows] = await pool.query(`
      SELECT u.full_name AS name, a.avatar_url, c.bio
      FROM users u
      LEFT JOIN avatars a ON u.avatar_id = a.id
      LEFT JOIN creator_profiles c ON u.id = c.user_id
      WHERE u.id = $1
    `, [creatorId]);

    const [settingsRows] = await pool.query(`
      SELECT voice_rate_per_min AS voice_rate, video_rate_per_min AS video_rate 
      FROM creator_settings WHERE user_id = $1
    `, [creatorId]);

    const [langRows] = await pool.query(`
      SELECT l.name_english 
      FROM users u JOIN languages l ON u.language_id = l.id 
      WHERE u.id = $1
    `, [creatorId]);

    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Creator not found' });
    }

    const profile = userRows[0];
    profile.avatar_url = profile.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png';
    profile.interests = ["Love", "Career", "Music"];
    profile.languages = langRows.length > 0 ? [langRows[0].name_english] : ["English"];
    profile.fixed_rates = settingsRows.length > 0 ? settingsRows[0] : { voice_rate: 10, video_rate: 60 };

    res.status(200).json({
      status: 'success',
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile settings:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.12 Update Profile
 */
exports.updateCreatorProfile = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { bio } = req.body;
    
    if (bio) {
      await pool.query(`
        INSERT INTO creator_profiles (user_id, bio) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) DO UPDATE SET bio = $3
      `, [creatorId, bio, bio]);
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully.',
      data: {
        bio: bio || "Hi! Let's chat about life.",
        interests: ["Love", "Career"]
      }
    });
  } catch (error) {
    console.error('Error updating creator profile:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
