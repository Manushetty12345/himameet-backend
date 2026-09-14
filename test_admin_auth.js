const pool = require('./db');

async function test() {
  try {
    const [rows] = await pool.query('SELECT id, is_admin, account_status FROM users WHERE is_admin = true');
    console.log("Admins:", rows);
    
    if (rows.length > 0) {
      const adminId = rows[0].id;
      const [userRows] = await pool.query(`SELECT account_status FROM users WHERE id = $1`, [adminId]);
      console.log("Admin Check:", userRows);
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

test();
