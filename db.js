const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect()
  .then(async (client) => {
    console.log('✅ Connected to PostgreSQL database');
    try {
      // Auto-initialize schema if it doesn't exist
      const res = await client.query("SELECT to_regclass('public.users');");
      if (!res.rows[0].to_regclass) {
        console.log('⚠️ Users table not found. Running database initialization script...');
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(path.join(__dirname, 'hima_schema_pg.sql'), 'utf8');
        await client.query(sql);
        console.log('✅ Database schema initialized successfully!');
      } else {
        console.log('✅ Database schema is already initialized.');
      }
    } catch (err) {
      console.error('❌ Error checking/initializing schema:', err.message);
    } finally {
      client.release();
    }
  })
  .catch(err => {
    console.error('❌ PostgreSQL Connection Error:', err.message);
  });

// Helper to mimic mysql2's [rows] = await pool.query() pattern
const originalQuery = pool.query.bind(pool);
pool.query = async (text, params) => {
  const result = await originalQuery(text, params);
  return [result.rows, result.fields];
};

// Helper for transactions (getConnection equivalent)
pool.getConnection = async () => {
  const client = await pool.connect();
  
  client.beginTransaction = () => client.query('BEGIN');
  client.commit = () => client.query('COMMIT');
  client.rollback = () => client.query('ROLLBACK');
  client.release = client.release.bind(client);

  // Wrap client.query to return [rows] format
  const originalClientQuery = client.query.bind(client);
  client.query = async (text, params) => {
    const result = await originalClientQuery(text, params);
    return [result.rows, result.fields];
  };

  return client;
};

module.exports = pool;
