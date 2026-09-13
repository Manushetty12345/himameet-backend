const pool = require('./db');
async function fix() {
  await pool.query(`UPDATE users SET is_verified = true WHERE user_role = 'creator' AND is_verified = false`);
  console.log('Fixed existing creators');
  process.exit(0);
}
fix();
