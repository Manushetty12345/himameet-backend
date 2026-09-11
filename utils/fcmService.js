const admin = require('firebase-admin');
const pool = require('../db');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Render stores multi-line secrets as \n escaped strings
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

/**
 * Send an incoming call push notification to a user who is offline.
 * @param {number} targetUserId - The receiver's user ID
 * @param {object} callData - { callId, callerId, name, avatar_url, call_type, rate }
 */
async function sendCallNotification(targetUserId, callData) {
  try {
    const result = await pool.query(
      'SELECT fcm_token FROM users WHERE id = $1',
      [targetUserId]
    );

    if (!result.rows || result.rows.length === 0) {
      console.log(`[FCM] No user found for ID ${targetUserId}`);
      return;
    }

    const fcmToken = result.rows[0].fcm_token;
    if (!fcmToken) {
      console.log(`[FCM] No FCM token for user ${targetUserId} — they are truly offline`);
      return;
    }

    const callTypeLabel = callData.call_type === 'video' ? 'Video' : 'Voice';

    const message = {
      token: fcmToken,
      data: {
        type: 'incoming_call',
        callId: String(callData.callId),
        callerId: String(callData.callerId),
        name: callData.name || 'User',
        avatar_url: callData.avatar_url || '',
        call_type: callData.call_type || 'audio',
        rate: String(callData.rate || 0),
      },
      notification: {
        title: `Incoming ${callTypeLabel} Call`,
        body: `${callData.name || 'Someone'} is calling you`,
      },
      android: {
        priority: 'high',
        notification: {
          priority: 'max',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] Call notification sent to user ${targetUserId}:`, response);
  } catch (err) {
    console.error('[FCM] Error sending call notification:', err.message);
  }
}

module.exports = { sendCallNotification };
