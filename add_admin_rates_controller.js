const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const newEndpoint = `
exports.updateCreatorRates = async (req, res) => {
  try {
    const { userId } = req.params;
    const { voice_rate_per_min, video_rate_per_min } = req.body;
    
    // UPSERT into creator_settings
    await pool.query(\`
      INSERT INTO creator_settings (user_id, voice_rate_per_min, video_rate_per_min) 
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE 
      SET voice_rate_per_min = EXCLUDED.voice_rate_per_min, video_rate_per_min = EXCLUDED.video_rate_per_min, updated_at = NOW()
    \`, [userId, voice_rate_per_min, video_rate_per_min]);
    
    res.json({ status: 'success', message: 'Rates updated successfully' });
  } catch (err) {
    console.error('[updateCreatorRates] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
`;

content += newEndpoint;
fs.writeFileSync(file, content);
console.log("SUCCESS");
