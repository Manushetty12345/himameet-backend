const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/utils/fcmService.js';
let content = fs.readFileSync(file, 'utf8');

const newFunc = `
async function sendCreatorOnlineNotification(targetUserId, creatorData) {
  try {
    const [rows] = await pool.query('SELECT fcm_token FROM users WHERE id = $1', [targetUserId]);
    if (!rows || rows.length === 0 || !rows[0].fcm_token) return;

    let bodyText = \`\${creatorData.name} is online!\`;
    if (creatorData.availableFor === 'both') {
      bodyText = \`\${creatorData.name} is online and available for both!\`;
    } else if (creatorData.availableFor === 'audio') {
      bodyText = \`\${creatorData.name} is online and available for call!\`;
    } else if (creatorData.availableFor === 'video') {
      bodyText = \`\${creatorData.name} is online and available for video call!\`;
    }

    const message = {
      token: rows[0].fcm_token,
      notification: {
        title: 'Creator Online',
        body: bodyText,
      },
      data: {
        type: 'creator_online',
        creatorId: String(creatorData.creatorId),
        name: String(creatorData.name),
        avatar_url: String(creatorData.avatar_url),
        availableFor: String(creatorData.availableFor),
      },
      android: {
        priority: 'high',
        notification: {
          imageUrl: creatorData.avatar_url,
        }
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
          }
        },
        fcm_options: {
          image: creatorData.avatar_url
        }
      }
    };

    if (admin.apps.length > 0) {
      await admin.messaging().send(message);
      console.log(\`[FCM] Online notification sent to user \${targetUserId} for creator \${creatorData.creatorId}\`);
    }
  } catch (err) {
    console.error('[FCM] Error sending online notification:', err.message);
  }
}

module.exports = { sendCallNotification, sendCallCancelNotification, sendCreatorOnlineNotification };
`;

content = content.replace(/module\.exports = { sendCallNotification, sendCallCancelNotification };/, newFunc);
fs.writeFileSync(file, content);
console.log("fcmService.js updated!");
