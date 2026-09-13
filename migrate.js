const pool = require('./db');

async function migrate() {
  try {
    await pool.query('ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS voice_sample_url TEXT');
    await pool.query('ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS ai_gender_score NUMERIC(5,2)');
    console.log('Successfully altered creator_applications');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}
migrate();
