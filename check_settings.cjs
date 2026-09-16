const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgres://himameet_user:D1iMhJ5QzXyYFk9mZt5Hw@dpg-cqs4jhm3s0qc73a5bl90-a.oregon-postgres.render.com/himameet',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const [settings] = await pool.query('SELECT key, value FROM settings');
  console.log('Settings:', settings.rows);
  pool.end();
}
check();
