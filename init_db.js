const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Added ?ssl=true to connection string
const connectionString = 'postgresql://hima_db_user:g0AYyBNQgw3JgmdcCc64yH5PaXXPEUFG@dpg-dab415k9v7es73c110m0-a.singapore-postgres.render.com/hima_db?ssl=true';

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log('Connecting to Render PostgreSQL...');
    await client.connect();
    console.log('Connected!');

    const sqlPath = path.join(__dirname, 'hima_schema_pg.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing schema...');
    await client.query(sql);
    console.log('Schema executed successfully! Database is ready to use.');
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await client.end();
  }
}

run();
