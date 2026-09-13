const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://hima_db_user:g0AYyBNQgw3JgmdcCc64yH5PaXXPEUFG@dpg-dab415k9v7es73c110m0-a.singapore-postgres.render.com/hima_db?ssl=true'
});

async function test() {
  const { rows } = await pool.query(`SELECT id, user_role, phone_number FROM users WHERE phone_number = '9110413284'`);
  console.log('User:', rows);
  if(rows.length > 0) {
     const appRows = await pool.query(`SELECT * FROM creator_applications WHERE user_id = $1`, [rows[0].id]);
     console.log('App:', appRows.rows);
  }
  pool.end();
}
test();
