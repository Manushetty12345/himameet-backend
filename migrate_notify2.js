const pool = require('./db');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS creator_online_notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, creator_id)
      );
    `);
    
    // Also add is_notify_online_enabled to users for easy toggle tracking?
    // Wait, the table creator_online_notifications is a many-to-many relationship.
    console.log("Table creator_online_notifications created successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    process.exit(0);
  }
}

// Give db.js time to connect
setTimeout(run, 1500);
