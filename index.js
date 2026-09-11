require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const pool = require('./db');

const authRoutes = require('./routes/authRoutes');
const userProfileRoutes = require('./routes/userProfileRoutes');
const supportRoutes = require('./routes/supportRoutes');
const staticRoutes = require('./routes/staticRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const creatorDashboardRoutes = require('./routes/creatorDashboardRoutes');
const feedRoutes = require('./routes/feedRoutes');
const walletRoutes = require('./routes/walletRoutes');
const friendRoutes = require('./routes/friendRoutes');
const chatRoutes = require('./routes/chatRoutes');
const callRoutes = require('./routes/callRoutes');
const giftRoutes = require('./routes/giftRoutes');

const setupChatSocket = require('./sockets/chatSocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hima Backend is running' });
});

// Temporary wallet reset route
app.get('/reset-wallet', async (req, res) => {
  try {
    await pool.query('UPDATE wallets SET coin_balance = 0');
    res.json({ status: 'ok', message: 'All wallets reset to 0' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY: Delete test user by phone number
// Open in browser: https://himameet-backend.onrender.com/delete-test-user?phone=9110413284
app.get('/delete-test-user', async (req, res) => {
  try {
    const phone = req.query.phone || '9110413284';
    const [users] = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phone]);
    if (users.length === 0) {
      return res.json({ message: `No user found with phone number ${phone}` });
    }
    const userId = users[0].id;
    await pool.query('DELETE FROM creator_applications WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_tags WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: `Successfully deleted user with phone ${phone} (ID: ${userId})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files from the 'public' folder (for avatars)
const path = require('path');
app.use('/public', express.static(path.join(__dirname, 'public')));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/user', onboardingRoutes);
app.use('/api/user', userProfileRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/static-pages', staticRoutes); 
app.use('/api', creatorRoutes);
app.use('/api/creator', creatorDashboardRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/call', callRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/gifts', giftRoutes);

// ── FCM Token: Save device token for push notifications ──
const { protect: authProtect } = require('./middleware/authMiddleware');
app.post('/api/user/fcm-token', authProtect, async (req, res) => {
  try {
    const { fcm_token } = req.body;
    const userId = req.user.id;
    if (!fcm_token) return res.status(400).json({ error: 'fcm_token is required' });
    await pool.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcm_token, userId]);
    res.json({ success: true, message: 'FCM token saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DEBUG: FCM Test endpoint ──
app.get('/test-fcm', async (req, res) => {
  try {
    const version = 'v7-' + new Date().toISOString();
    // pool.query returns [rows, fields] per db.js
    const [users] = await pool.query('SELECT id, full_name, gender, user_role, (fcm_token IS NOT NULL) as has_token FROM users ORDER BY id DESC LIMIT 20');
    const withToken = (users || []).find(u => u.has_token);

    if (!withToken) {
      return res.json({ version, message: 'No user has FCM token yet. Open the app first!', total_users: (users || []).length, users: users || [] });
    }

    const { sendCallNotification } = require('./utils/fcmService');
    await sendCallNotification(withToken.id, {
      callId: 9999, callerId: 0, name: 'Test Caller', avatar_url: '', call_type: 'audio', rate: 10,
    });
    res.json({ version, message: `✅ Notification sent to ${withToken.full_name} (ID: ${withToken.id})!`, total_users: users.length, all_users: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Decline call via HTTP (used by notifee background handler) ──
app.post('/api/calls/:callId/decline', async (req, res) => {
  try {
    const { callId } = req.params;
    const ioInstance = req.app.get('io');

    // Mark call as declined in DB
    await pool.query("UPDATE call_logs SET status = 'declined' WHERE id = $1", [callId]);

    // Notify the caller via socket if they're online
    if (ioInstance) {
      const [callRows] = await pool.query('SELECT caller_id FROM call_logs WHERE id = $1', [callId]);
      if (callRows && callRows.length > 0) {
        ioInstance.to(`user_${callRows[0].caller_id}`).emit('call_declined', { callId: parseInt(callId) });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Setup WebSockets
const io = setupChatSocket(server);
app.set('io', io);

// Temporary route to simulate a female accepting the last initiated call
app.get('/accept-last-call', async (req, res) => {
  try {
    const ioInstance = req.app.get('io');
    const [rows] = await pool.query("SELECT id, caller_id, status FROM call_logs ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) {
      return res.json({ error: 'No calls found in the database whatsoever.' });
    }
    
    const call = rows[0];
    
    // Emit the acceptance to the caller
    ioInstance.to(`user_${call.caller_id}`).emit('call_accepted', { callId: call.id });
    
    // Optional: update status to 'ongoing' or 'accepted' to prevent double-accepts
    await pool.query("UPDATE call_logs SET status = 'ongoing' WHERE id = $1", [call.id]);
    
    res.json({ success: true, message: `Simulated accept for call ID: ${call.id} (was status: ${call.status}). The app should now navigate to the CallScreen.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// TEMPORARY TEST ROUTE - CLEAR STUCK CALLS (activeUsersInCall)
// Open in browser: https://himameet-backend.onrender.com/clear-active-calls
// ============================================================
const callSocketModule = require('./sockets/callSocket');
app.get('/clear-active-calls', (req, res) => {
  if (callSocketModule.activeUsersInCall) {
    callSocketModule.activeUsersInCall.clear();
    res.json({ success: true, message: 'All active and stuck calls have been cleared from memory!' });
  } else {
    res.json({ success: false, message: 'Could not access activeUsersInCall.' });
  }
});

// ============================================================
// TEMPORARY TEST ROUTE - Accept the latest pending friend request
// Open in browser: https://himameet-backend.onrender.com/accept-latest-friend-request
// ============================================================
app.get('/accept-latest-friend-request', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fr.id, fr.sender_id, fr.receiver_id, 
              s.full_name AS sender_name, r.full_name AS receiver_name
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_id
       JOIN users r ON r.id = fr.receiver_id
       WHERE fr.status = 'pending'
       ORDER BY fr.id DESC
       LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return res.json({ error: 'No pending friend requests found in the database.' });
    }

    const req_ = rows[0];

    await pool.query(`UPDATE friend_requests SET status = 'accepted' WHERE id = $1`, [req_.id]);
    await pool.query(
      `INSERT INTO friendships (user_one_id, user_two_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req_.sender_id, req_.receiver_id]
    );

    res.json({
      success: true,
      message: `✅ Friend request accepted! ${req_.sender_name} and ${req_.receiver_name} are now friends.`,
      request_id: req_.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMP: Simulate female accepting the latest pending friend request
// Open in browser: https://himameet-backend.onrender.com/female-accept-latest-request
app.get('/female-accept-latest-request', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fr.id, fr.sender_id, fr.receiver_id,
              s.full_name AS sender_name, r.full_name AS receiver_name
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_id
       JOIN users r ON r.id = fr.receiver_id
       WHERE fr.status = 'pending' OR fr.status IS NULL
       ORDER BY fr.id DESC LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return res.json({ error: 'No pending friend requests found.' });
    }

    const req_ = rows[0];

    // Simulate female accepting: set status to accepted_by_receiver
    await pool.query(
      `UPDATE friend_requests SET status = 'accepted_by_receiver' WHERE id = $1`,
      [req_.id]
    );

    res.json({
      success: true,
      message: `✅ Female (${req_.receiver_name}) accepted! Now check male's REQUESTS tab.`,
      request_id: req_.id,
      sender: req_.sender_name,
      receiver: req_.receiver_name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: See all friend requests
app.get('/debug-friend-requests', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status,
              s.full_name AS sender_name, r.full_name AS receiver_name
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_id
       JOIN users r ON r.id = fr.receiver_id
       ORDER BY fr.id DESC LIMIT 20`
    );
    res.json({ total: rows.length, requests: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize tables if they don't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS blocked_users (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER REFERENCES users(id),
    blocked_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
  )
`).then(() => console.log('Blocked users table verified')).catch(console.error);

// Add fcm_token column to users table if it doesn't exist
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT`)
  .then(() => console.log('fcm_token column verified'))
  .catch(console.error);

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
