const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const endpoints = `
exports.getGlobalRates = async (req, res) => {
  try {
    const [rows] = await pool.query(\`SELECT key, value FROM settings WHERE key IN ('default_voice_rate', 'default_video_rate')\`);
    let voiceRate = 20;
    let videoRate = 40;
    
    for (const row of rows) {
      if (row.key === 'default_voice_rate') voiceRate = parseInt(row.value, 10);
      if (row.key === 'default_video_rate') videoRate = parseInt(row.value, 10);
    }
    
    res.json({ status: 'success', data: { voice_rate_per_min: voiceRate, video_rate_per_min: videoRate } });
  } catch (err) {
    console.error('[getGlobalRates] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.updateGlobalRates = async (req, res) => {
  try {
    const { voice_rate_per_min, video_rate_per_min } = req.body;
    
    // Save to settings table
    await pool.query(\`
      INSERT INTO settings (key, value, description) VALUES ('default_voice_rate', $1, 'Global voice rate for female creators')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    \`, [voice_rate_per_min.toString()]);
    
    await pool.query(\`
      INSERT INTO settings (key, value, description) VALUES ('default_video_rate', $1, 'Global video rate for female creators')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    \`, [video_rate_per_min.toString()]);
    
    // Immediately apply to all existing creators
    await pool.query(\`
      UPDATE creator_settings SET voice_rate_per_min = $1, video_rate_per_min = $2
    \`, [voice_rate_per_min, video_rate_per_min]);
    
    res.json({ status: 'success', message: 'Global rates updated successfully' });
  } catch (err) {
    console.error('[updateGlobalRates] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
`;

content += endpoints;

// Update reviewApplication to insert default rates
const reviewRegex = /if \(action === 'approved'\) \{\s*await pool\.query\(`UPDATE users SET user_role = 'creator', is_verified = true WHERE id = \$1`, \[app\.user_id\]\);\s*\}/;
const reviewReplacement = `if (action === 'approved') {
        await pool.query(\`UPDATE users SET user_role = 'creator', is_verified = true WHERE id = $1\`, [app.user_id]);
        
        // Fetch default rates
        const [settingsRows] = await pool.query(\`SELECT key, value FROM settings WHERE key IN ('default_voice_rate', 'default_video_rate')\`);
        let voiceRate = 20;
        let videoRate = 40;
        for (const row of settingsRows) {
          if (row.key === 'default_voice_rate') voiceRate = parseInt(row.value, 10);
          if (row.key === 'default_video_rate') videoRate = parseInt(row.value, 10);
        }
        
        // Create or update creator_settings
        await pool.query(\`
          INSERT INTO creator_settings (user_id, voice_rate_per_min, video_rate_per_min) 
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id) DO NOTHING
        \`, [app.user_id, voiceRate, videoRate]);
      }`;

if (reviewRegex.test(content)) {
  content = content.replace(reviewRegex, reviewReplacement);
  fs.writeFileSync(file, content);
  console.log("SUCCESS");
} else {
  console.log("FAILED regex");
}

