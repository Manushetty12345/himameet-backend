const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://hima_db_user:g0AYyBNQgw3JgmdcCc64yH5PaXXPEUFG@dpg-dab415k9v7es73c110m0-a.singapore-postgres.render.com/hima_db?ssl=true',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const { rows } = await pool.query(`SELECT id FROM users WHERE phone_number = '9110413284'`);
    if(rows.length > 0) {
       const userId = rows[0].id;
       console.log('Found user with ID:', userId);
       await pool.query(`DELETE FROM creator_applications WHERE user_id = $1`, [userId]);
       await pool.query(`DELETE FROM user_tags WHERE user_id = $1`, [userId]);
       await pool.query(`DELETE FROM wallets WHERE user_id = $1`, [userId]);
       await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
       console.log('User deleted successfully.');
    } else {
       console.log('User not found.');
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
