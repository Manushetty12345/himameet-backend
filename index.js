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


// Setup WebSockets
const io = setupChatSocket(server);
app.set('io', io);

// Temporary route to simulate a female accepting the last initiated call
app.get('/accept-last-call', async (req, res) => {
  try {
    const ioInstance = req.app.get('io');
    const [rows] = await pool.query("SELECT id, caller_id FROM call_logs WHERE status = 'initiated' ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) {
      return res.json({ error: 'No pending initiated calls found in the database.' });
    }
    
    const call = rows[0];
    // Emit the acceptance to the caller
    ioInstance.to(`user_${call.caller_id}`).emit('call_accepted', { callId: call.id });
    
    // Optional: update status to 'ongoing' or 'accepted' to prevent double-accepts
    await pool.query("UPDATE call_logs SET status = 'ongoing' WHERE id = $1", [call.id]);
    
    res.json({ success: true, message: `Simulated accept for call ID: ${call.id}. The app should now navigate to the CallScreen.` });
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
