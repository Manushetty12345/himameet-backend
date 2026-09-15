const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/creatorProfileController.js';
let content = fs.readFileSync(file, 'utf8');

const target = `    res.status(200).json({
      status: 'success',
      data: {
        creator_id: creator.id,
        username: creator.username,
        avatar_url: creator.avatar_url,
        bio: creator.bio,
        rating: creator.rating || 0.0,
        ratingsCount: creator.ratings_count || 0,
        friendshipStatus: friendshipStatus,
        is_blocked: isBlocked
      }
    });`;

const replacement = `    // Check notify online status
    const [notifyRows] = await pool.query('SELECT 1 FROM online_notify_subscriptions WHERE subscriber_id = $1 AND target_user_id = $2', [userId, creatorId]);
    const is_notify_online_enabled = notifyRows.length > 0;

    res.status(200).json({
      status: 'success',
      data: {
        creator_id: creator.id,
        username: creator.username,
        avatar_url: creator.avatar_url,
        bio: creator.bio,
        rating: creator.rating || 0.0,
        ratingsCount: creator.ratings_count || 0,
        friendshipStatus: friendshipStatus,
        is_blocked: isBlocked,
        is_notify_online_enabled: is_notify_online_enabled
      }
    });`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("getProfile updated with notify status!");
} else {
  console.log("Could not find target in getProfile");
}
