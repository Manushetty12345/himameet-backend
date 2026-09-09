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
// TEMPORARY TEST ROUTE - Accept the latest pending friend request
// Open in browser: https://himameet-backend.onrender.com/accept-latest-friend-request
// ============================================================
app.get('/accept-latest-friend-request', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fr.id, fr.sender_id, fr.receiver_id, 
              s.full_name AS sender_name, r.full_name AS receiver_name
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_id
       JOIN users r ON r.id = fr.receiver_id
       WHERE fr.status = 'pending'
       ORDER BY fr.id DESC
       LIMIT 1`
    );

    const rows = result.rows;

    if (rows.length === 0) {
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

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
