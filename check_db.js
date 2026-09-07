const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://hima_db_user:g0AYyBNQgw3JgmdcCc64yH5PaXXPEUFG@dpg-dab415k9v7es73c110m0-a.singapore-postgres.render.com/hima_db',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  const client = await pool.connect();
  try {
    const langRes = await client.query("SELECT id, name_english FROM languages WHERE name_english ILIKE 'Tamil' LIMIT 1");
    console.log("Languages:", JSON.stringify(langRes.rows));
    const tagRes = await client.query("SELECT id, name FROM tags WHERE tag_type = 'interest' ORDER BY id");
    console.log("Existing interests:", JSON.stringify(tagRes.rows));
    const avatarRes = await client.query("SELECT id FROM avatars WHERE gender = 'female' LIMIT 1");
    console.log("Female avatar:", JSON.stringify(avatarRes.rows));
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);