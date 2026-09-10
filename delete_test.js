require('dotenv').config();
const pool = require('./db');

async function run() {
  try {
    const [u] = await pool.query("SELECT id FROM users WHERE phone_number = '9110413284'");
    if(!u.length) {
      console.log('No user found');
      process.exit(0);
    }
    const uid = u[0].id;
    await pool.query('DELETE FROM creator_applications WHERE user_id = $1', [uid]);
    await pool.query('DELETE FROM user_tags WHERE user_id = $1', [uid]);
    await pool.query('DELETE FROM wallets WHERE user_id = $1', [uid]);
    await pool.query('DELETE FROM users WHERE id = $1', [uid]);
    console.log('User deleted successfully (ID: ' + uid + ')');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
