const admin = require('firebase-admin');
const pool = require('../db');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Render stores multi-line secrets as \n escaped strings
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.warn('Firebase credentials missing. Push notifications will not work.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error.message);
  }
}

/**
 * Send an incoming call push notification to a user who is offline.
 * @param {number} targetUserId - The receiver's user ID
 * @param {object} callData - { callId, callerId, name, avatar_url, call_type, rate }
 */
async function sendCallNotification(targetUserId, callData) {
  try {
    const [rows] = await pool.query(
      'SELECT fcm_token FROM users WHERE id = $1',
      [targetUserId]
    );

    console.log(`[FCM] DB lookup for user ${targetUserId}:`, JSON.stringify(rows));

    if (!rows || rows.length === 0) {
      console.log(`[FCM] No user found for ID ${targetUserId}`);
      return;
    }

    const fcmToken = rows[0].fcm_token;
    if (!fcmToken) {
      console.log(`[FCM] No FCM token for user ${targetUserId} (Value: ${fcmToken}) — they are truly offline`);
      return;
    }
    
    console.log(`[FCM] Found token for user ${targetUserId}: ${fcmToken.substring(0, 15)}...`);

    const callTypeLabel = callData.call_type === 'video' ? 'Video' : 'Voice';

      if (admin.apps.length > 0) {
        const message = {
          token: fcmToken,
          data: {
            type: 'incoming_call',
            callId: String(callData.callId),
            callerId: String(callData.callerId),
            name: String(callData.name),
            avatar_url: String(callData.avatar_url),
            call_type: String(callData.call_type),
            rate: String(callData.rate || 0),
            agoraToken: String(callData.agoraToken || ''),
          },
          android: {
            priority: 'high',
          },
          apns: {
            payload: {
              aps: {
                contentAvailable: true,
              },
            },
            headers: {
              'apns-priority': '10',
            },
          },
        };

        const response = await admin.messaging().send(message);
        console.log(`[FCM] Successfully sent call notification to user ${targetUserId}:`, response);
      } else {
        console.warn(`[FCM] Cannot send notification to user ${targetUserId} because Firebase is not initialized.`);
      }
  } catch (err) {
    console.error('[FCM] Error sending call notification:', err.message);
  }
}

async function sendCallCancelNotification(targetUserId, callId) {
  try {
    const [rows] = await pool.query('SELECT fcm_token FROM users WHERE id = $1', [targetUserId]);
    if (!rows || rows.length === 0 || !rows[0].fcm_token) return;

    const message = {
      token: rows[0].fcm_token,
      data: {
        type: 'call_cancelled',
        callId: String(callId),
      },
      android: {
        priority: 'high',
      },
    };

    await admin.messaging().send(message);
    console.log(`[FCM] Cancel notification sent to user ${targetUserId} for call ${callId}`);
  } catch (err) {
    console.error('[FCM] Error sending call cancel notification:', err.message);
  }
}


async function sendCreatorOnlineNotification(targetUserId, creatorData) {
  try {
    const [rows] = await pool.query('SELECT fcm_token FROM users WHERE id = $1', [targetUserId]);
    if (!rows || rows.length === 0 || !rows[0].fcm_token) return;

    let bodyText = "She's ready for audio & video calls. Don't miss out!";
    if (creatorData.availableFor === 'both') {
      bodyText = "She's ready for audio & video calls. Don't miss out!";
    } else if (creatorData.availableFor === 'audio') {
      bodyText = "She's ready for audio calls. Don't miss out!";
    } else if (creatorData.availableFor === 'video') {
      bodyText = "She's ready for video calls. Don't miss out!";
    }

    const message = {
      token: rows[0].fcm_token,
      notification: {
        title: `${creatorData.name} is online!`,
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
      console.log(`[FCM] Online notification sent to user ${targetUserId} for creator ${creatorData.creatorId}`);
    }
  } catch (err) {
    console.error('[FCM] Error sending online notification:', err.message);
  }
}

module.exports = { sendCallNotification, sendCallCancelNotification, sendCreatorOnlineNotification };

