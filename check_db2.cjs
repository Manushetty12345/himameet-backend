const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgres://himameet_user:D1iMhJ5QzXyYFk9mZt5Hw@dpg-cqs4jhm3s0qc73a5bl90-a.oregon-postgres.render.com/himameet',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const [callRows] = await pool.query('SELECT id, caller_id, receiver_id, call_type, rate_per_min FROM call_logs ORDER BY created_at DESC LIMIT 5');
  console.log('Recent Calls:', callRows);
  pool.end();
}
check();
