const pool = require('./db');

async function updateAge() {
  try {
    console.log('Attempting to update age for Priya Tamil...');
    const [rows] = await pool.query('UPDATE users SET age = $1 WHERE full_name ILIKE $2 RETURNING id, full_name, age', [30, '%Priya%']);
    
    if (rows && rows.length > 0) {
      console.log('✅ Update successful! Updated users:', rows);
    } else {
      console.log('⚠️ No user found matching the name "Priya".');
    }
  } catch (err) {
    console.error('❌ Update failed:', err.message);
  } finally {
    process.exit(0);
  }
}

updateAge();
