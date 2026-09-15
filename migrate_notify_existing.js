const pool = require('./db');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS online_notify_subscriptions (
        id BIGSERIAL PRIMARY KEY,
        subscriber_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(subscriber_id, target_user_id)
      );
    `);
    console.log("Table online_notify_subscriptions checked/created successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    process.exit(0);
  }
}

// Give db.js time to connect
setTimeout(run, 1500);
