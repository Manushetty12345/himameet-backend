const pool = require('./db');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        id SERIAL PRIMARY KEY,
        blocker_id INTEGER REFERENCES users(id),
        blocked_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(blocker_id, blocked_id)
      )
    `);
    console.log('Blocked users table ready');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
