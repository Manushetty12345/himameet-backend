require("dotenv").config({ path: "D:/App6/hima-meet-backend/.env" });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const { rows } = await pool.query(`SELECT id, last_message_id, created_at FROM conversations ORDER BY created_at DESC LIMIT 5`);
  console.log("Conversations:", rows);
  
  const { rows: msgRows } = await pool.query(`SELECT id, conversation_id, message_text FROM messages ORDER BY created_at DESC LIMIT 5`);
  console.log("Messages:", msgRows);
  
  process.exit(0);
}
check();
