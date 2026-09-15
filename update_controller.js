const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/creatorDashboardController.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('fcmService')) {
  content = `const fcmService = require('../utils/fcmService');\n` + content;
}

const target = `    console.log(\`[toggleStatus] SUCCESS: \${call_type} => \${value}\`);

    res.status(200).json({`;
    
const replacement = `    console.log(\`[toggleStatus] SUCCESS: \${call_type} => \${value}\`);

    // If changing to TRUE (available), fire push notifications to subscribers
    if (value) {
      try {
        const [subRows] = await pool.query('SELECT subscriber_id FROM online_notify_subscriptions WHERE target_user_id = $1', [creatorId]);
        if (subRows && subRows.length > 0) {
          // Get creator details
          const [creatorRows] = await pool.query('SELECT username, avatar_url FROM users WHERE id = $1', [creatorId]);
          if (creatorRows.length > 0) {
            const creator = creatorRows[0];
            // Get current overall status
            const [statusRows] = await pool.query('SELECT is_voice_online, is_video_online FROM creator_settings WHERE user_id = $1', [creatorId]);
            const status = statusRows.length > 0 ? statusRows[0] : { is_voice_online: false, is_video_online: false };
            
            let availableFor = 'both';
            if (status.is_voice_online && !status.is_video_online) availableFor = 'audio';
            else if (!status.is_voice_online && status.is_video_online) availableFor = 'video';
            
            const creatorData = {
              creatorId: creatorId,
              name: creator.username || 'Creator',
              avatar_url: creator.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-avatar.png',
              availableFor: availableFor
            };
            
            for (const sub of subRows) {
              await fcmService.sendCreatorOnlineNotification(sub.subscriber_id, creatorData);
            }
          }
        }
      } catch (err) {
        console.error('[toggleStatus] Error sending notifications:', err);
      }
    }

    res.status(200).json({`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("creatorDashboardController.js updated!");
} else {
  console.log("Could not find target in creatorDashboardController.js");
}
