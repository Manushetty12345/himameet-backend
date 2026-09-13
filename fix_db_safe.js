const { Pool } = require('pg');
require('dotenv').config();

async function fix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query(`UPDATE users SET is_verified = true WHERE user_role = 'creator' AND is_verified = false`);
    console.log(`Successfully fixed ${res.rowCount} old creators in the database!`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fix();
