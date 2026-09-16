const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://himameet_user:D1iMhJ5QzXyYFk9mZt5Hw@dpg-cqs4jhm3s0qc73a5bl90-a.oregon-postgres.render.com/himameet' });

async function check() {
  const [callRows] = await pool.query('SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 1');
  console.log('Call Log:', callRows.rows[0]);
  
  if (callRows.rows[0]) {
    const receiverId = callRows.rows[0].receiver_id;
    const [settings] = await pool.query('SELECT * FROM creator_settings WHERE user_id = $1', [receiverId]);
    console.log('Creator Settings:', settings.rows[0]);
  }
  pool.end();
}
check();
