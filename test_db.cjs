const { Pool } = require('pg');

// Parse the DATABASE_URL manually from the .env file
const fs = require('fs');
const envContent = fs.readFileSync('D:/App6/hima-meet-backend/.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.*)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

if (!dbUrl) {
  console.log("No DATABASE_URL found");
  process.exit(1);
}

// Check if it's a Render URL to determine SSL
const isInternal = !dbUrl.includes('.render.com');
const useSSL = isInternal ? false : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: dbUrl,
  ssl: useSSL
});

async function check() {
  try {
    const { rows } = await pool.query(`SELECT id, last_message_id, created_at FROM conversations ORDER BY created_at DESC LIMIT 5`);
    console.log("Conversations:", JSON.stringify(rows, null, 2));
    
    const { rows: msgRows } = await pool.query(`SELECT id, conversation_id, message_text FROM messages ORDER BY created_at DESC LIMIT 5`);
    console.log("Messages:", JSON.stringify(msgRows, null, 2));
  } catch (e) {
    console.error("DB Error:", e.message);
  } finally {
    pool.end();
    process.exit(0);
  }
}
check();
