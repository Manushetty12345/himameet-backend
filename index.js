require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

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
setupChatSocket(server);

// TEMPORARY: Route to manually accept all friend requests via browser
app.get('/accept-all-requests', async (req, res) => {
  try {
    const pool = require('./db');
    const [requests] = await pool.query("SELECT * FROM friend_requests WHERE status = 'pending'");
    let count = 0;
    for (const request of requests) {
      await pool.query('DELETE FROM friend_requests WHERE id = $1', [request.id]);
      await pool.query(`
        INSERT INTO friendships (user_one_id, user_two_id) 
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [request.sender_id, request.receiver_id]);
      count++;
    }
    res.send(`<h2>Success!</h2><p>Accepted ${count} pending friend requests.</p>`);
  } catch (err) {
    res.status(500).send(`<h2>Error</h2><p>${err.message}</p>`);
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
