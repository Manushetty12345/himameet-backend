const pool = require('./db');
async function makeCreator() {
  try {
    await pool.query("UPDATE users SET user_role = 'creator' WHERE id = 6");
    await pool.query("INSERT IGNORE INTO creator_settings (user_id, is_voice_online, is_video_online) VALUES (6, 1, 1)");
    console.log('Upgraded User 6 to creator');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
makeCreator();
