const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const useSSL = connectionString && connectionString.includes('.render.com') ? { rejectUnauthorized: false } : false;

const pool = new Pool({ connectionString, ssl: useSSL });

const PHONE = '8088591796';

async function run() {
  const client = await pool.connect();
  console.log('Connected to DB');

  try {
    // Delete OTP verifications first
    const otpRes = await client.query(
      'DELETE FROM otp_verifications WHERE phone_number = $1',
      [PHONE]
    );
    console.log('OTP verifications deleted:', otpRes.rowCount);

    // Get user id
    const userRow = await client.query(
      'SELECT id, phone_number, full_name, gender FROM users WHERE phone_number = $1',
      [PHONE]
    );

    if (userRow.rows.length === 0) {
      console.log('No user found with phone number:', PHONE);
      return;
    }

    const user = userRow.rows[0];
    console.log('Found user:', user);

    // Delete user (CASCADE will handle wallets, sessions, etc.)
    const delRes = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, phone_number',
      [user.id]
    );
    console.log('Deleted user:', delRes.rows[0]);
    console.log('Done! All records removed for phone:', PHONE);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
