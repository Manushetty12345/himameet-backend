const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://hima_db_user:g0AYyBNQgw3JgmdcCc64yH5PaXXPEUFG@dpg-dab415k9v7es73c110m0-a.singapore-postgres.render.com/hima_db?ssl=true'
});

async function run() {
  const [rows] = await pool.query(`
    SELECT 
      c.id AS call_id,
      u.id AS user_id,
      u.name,
      cs.voice_rate_per_min,
      cs.video_rate_per_min
    FROM call_logs c
    JOIN users u ON (u.id = c.receiver_id OR u.id = c.caller_id)
    LEFT JOIN creator_settings cs ON cs.user_id = u.id
    WHERE cs.voice_rate_per_min IS NOT NULL
    LIMIT 5
  `);
  console.log(rows);
  process.exit();
}
run();
