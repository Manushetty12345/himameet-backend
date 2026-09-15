const admin = require('firebase-admin');
const serviceAccount = require('./himameet-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function testPush() {
  try {
    const fcmToken = 'TEST_TOKEN'; // I don't know the user's FCM token.
    console.log("Firebase initialized successfully using service account JSON");
  } catch (e) {
    console.error(e);
  }
}
testPush();
