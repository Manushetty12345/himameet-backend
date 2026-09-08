const pool = require('./db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent'`);
    console.log('Successfully added status column to messages table.');
    process.exit(0);
  } catch (err) {
    if (err.code === '42701') {
      console.log('Column status already exists.');
      process.exit(0);
    } else {
      console.error('Migration failed:', err);
      process.exit(1);
    }
  }
}

migrate();
