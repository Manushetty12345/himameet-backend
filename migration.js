const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://hima_db_user:g0AYyBNQgw3JgmdcCc64yH5PaXXPEUFG@dpg-dab415k9v7es73c110m0-a.singapore-postgres.render.com/hima_db?ssl=true'
});

async function runMigration() {
  for (let i = 0; i < 5; i++) {
    try {
      await pool.query(`
        ALTER TABLE bank_accounts 
        ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
        ADD COLUMN IF NOT EXISTS pan_card_url TEXT;
      `);
      console.log('Migration successful: Added upi_id, phone_number, pan_card_url to bank_accounts');
      break;
    } catch (error) {
      console.error('Migration failed attempt', i, ':', error);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  await pool.end();
}

runMigration();
