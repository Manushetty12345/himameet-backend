const pool = require('./db');

async function updateRates() {
  try {
    const res = await pool.query(`
      UPDATE creator_settings 
      SET voice_rate_per_min = 10, video_rate_per_min = 20 
      WHERE voice_rate_per_min = 8 OR video_rate_per_min = 15
    `);
    console.log('Update successful, affected rows:', res[0].rowCount ?? res[0].length);
  } catch (err) {
    console.error('Error updating rates:', err);
  } finally {
    process.exit(0);
  }
}

updateRates();
