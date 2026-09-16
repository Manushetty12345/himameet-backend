const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/App6/hima-meet-backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hima_meet_db'
});

async function run() {
  const res = await pool.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'call_logs';
  `);
  console.log(res.rows);
  pool.end();
}

run();
