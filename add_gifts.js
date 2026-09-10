const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isInternal = connectionString && !connectionString.includes('.render.com');
const useSSL = isInternal ? false : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: connectionString,
  ssl: useSSL
});

async function setupGifts() {
  try {
    console.log('Connecting to database...');
    // 1. Create gifts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gifts (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price INTEGER NOT NULL,
        icon VARCHAR(50) NOT NULL,
        color VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created gifts table');

    // 2. Insert default gifts
    const res = await pool.query('SELECT count(*) FROM gifts');
    if (parseInt(res.rows[0].count) === 0) {
      const defaultGifts = [
        { id: 'rose', name: 'Rose', price: 10, icon: '🌹', color: '#FF4D4D' },
        { id: 'coffee', name: 'Coffee', price: 25, icon: '☕', color: '#8B4513' },
        { id: 'heart', name: 'Heart', price: 50, icon: '💖', color: '#FF1493' },
        { id: 'diamond', name: 'Diamond', price: 100, icon: '💎', color: '#00DFD8' },
        { id: 'crown', name: 'Crown', price: 500, icon: '👑', color: '#FFD700' }
      ];

      for (const gift of defaultGifts) {
        await pool.query(
          'INSERT INTO gifts (id, name, price, icon, color) VALUES ($1, $2, $3, $4, $5)',
          [gift.id, gift.name, gift.price, gift.icon, gift.color]
        );
      }
      console.log('✅ Inserted default gifts');
    } else {
      console.log('⚠️ Gifts already exist in database');
    }
  } catch (err) {
    console.error('❌ Error setting up gifts:', err.message);
  } finally {
    pool.end();
  }
}

setupGifts();
