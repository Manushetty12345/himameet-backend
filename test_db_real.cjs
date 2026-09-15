const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://hima_db_user:g0AYyBNQgw3JgmdcCc64yH5PaXXPEUFG@dpg-dab415k9v7es73c110m0-a.singapore-postgres.render.com/hima_db?ssl=true',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const { rows: convs } = await pool.query(`SELECT id, user_one_id, user_two_id, last_message_id FROM conversations ORDER BY created_at DESC LIMIT 5`);
    console.log("Conversations:", JSON.stringify(convs, null, 2));
    
    if (convs.length > 0 && convs[0].last_message_id) {
        const { rows: msg } = await pool.query(`SELECT id, conversation_id, message_text FROM messages WHERE id = $1`, [convs[0].last_message_id]);
        console.log("Last Message of latest conv:", JSON.stringify(msg, null, 2));
    }
    
    const { rows: friends } = await pool.query(`SELECT * FROM friendships LIMIT 5`);
    console.log("Friendships:", JSON.stringify(friends, null, 2));
    
  } catch (e) {
    console.error("DB Error:", e.message);
  } finally {
    pool.end();
    process.exit(0);
  }
}
check();
