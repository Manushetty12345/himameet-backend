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

// Temporary endpoint to seed languages from the app screenshots
app.get('/admin/seed-languages', async (req, res) => {
  const pool = require('./db');
  let client;
  try {
    client = await pool.connect();
    
    const languages = [
      { english: 'Tamil', native: 'தமிழ்', code: 'ta' },
      { english: 'Telugu', native: 'తెలుగు', code: 'te' },
      { english: 'Malayalam', native: 'മലയാളം', code: 'ml' },
      { english: 'Kannada', native: 'ಕನ್ನಡ', code: 'kn' },
      { english: 'Hindi', native: 'हिंदी', code: 'hi' },
      { english: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'pa' },
      { english: 'Marathi', native: 'मराठी', code: 'mr' },
      { english: 'Bengali', native: 'বাংলা', code: 'bn' },
      { english: 'Assamese', native: 'অসমীয়া', code: 'as' },
      { english: 'Odia', native: 'ଓଡ଼ିଆ', code: 'or' },
      { english: 'Gujarati', native: 'ગુજરાતી', code: 'gu' }
    ];

    await client.query('BEGIN');
    await client.query('DELETE FROM languages'); 
    
    for (let i = 0; i < languages.length; i++) {
      await client.query(
        'INSERT INTO languages (name_english, name_native, language_code, display_order) VALUES ($1, $2, $3, $4)',
        [languages[i].english, languages[i].native, languages[i].code, i + 1]
      );
    }
    await client.query('COMMIT');

    res.json({ message: '11 Languages successfully added to the database!' });
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
