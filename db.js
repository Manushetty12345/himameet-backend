const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;

// If the user accidentally provided the External Render URL in the dashboard, 
// force it to the Internal URL because external URLs are blocked from inside Render's network.
if (connectionString && connectionString.includes('.render.com')) {
  console.log('DEBUG: Converting External Database URL to Internal Database URL');
  connectionString = connectionString.replace('.singapore-postgres.render.com', '');
  connectionString = connectionString.replace('?ssl=true', '');
  connectionString = connectionString.replace('&ssl=true', '');
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: false // Internal Render connections do not use SSL
});

pool.connect()
  .then(async (client) => {
    console.log('✅ Connected to PostgreSQL database');
    console.log('DEBUG DATABASE_URL is defined:', !!process.env.DATABASE_URL);
    console.log('DEBUG SSL option used:', (connectionString && connectionString.includes('.render.com')) ? 'rejectUnauthorized: false' : 'false');
    
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
    console.error('DEBUG DATABASE_URL is defined:', !!process.env.DATABASE_URL);
    console.error('DEBUG Connection String:', connectionString ? connectionString.replace(/:[^:@]+@/, ':***@') : 'undefined');
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
