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

// Temporary endpoint to insert the 10 avatar URLs into the database
app.get('/admin/seed-avatars', async (req, res) => {
  const pool = require('./db');
  let client;
  try {
    client = await pool.connect();
    
    const avatars = [
      // 5 Male Avatars
      { url: 'https://himameet-backend.onrender.com/public/avatars/male_1.png', gender: 'male' },
      { url: 'https://himameet-backend.onrender.com/public/avatars/male_2.png', gender: 'male' },
      { url: 'https://himameet-backend.onrender.com/public/avatars/male_3.png', gender: 'male' },
      { url: 'https://himameet-backend.onrender.com/public/avatars/male_4.png', gender: 'male' },
      { url: 'https://himameet-backend.onrender.com/public/avatars/male_5.png', gender: 'male' },
      // 5 Female Avatars
      { url: 'https://himameet-backend.onrender.com/public/avatars/female_1.png', gender: 'female' },
      { url: 'https://himameet-backend.onrender.com/public/avatars/female_2.png', gender: 'female' },
      { url: 'https://himameet-backend.onrender.com/public/avatars/female_3.png', gender: 'female' },
      { url: 'https://himameet-backend.onrender.com/public/avatars/female_4.png', gender: 'female' },
      { url: 'https://himameet-backend.onrender.com/public/avatars/female_5.png', gender: 'female' },
    ];

    await client.query('BEGIN');
    // Clear existing to avoid duplicates if run multiple times
    await client.query('DELETE FROM avatars'); 
    
    for (let i = 0; i < avatars.length; i++) {
      await client.query(
        'INSERT INTO avatars (avatar_url, gender, display_order) VALUES ($1, $2, $3)',
        [avatars[i].url, avatars[i].gender, i + 1]
      );
    }
    await client.query('COMMIT');

    res.json({ message: '10 Avatars successfully added to the database!' });
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    if (client) client.release();
  }
});

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

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
