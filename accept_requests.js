require('dotenv').config();
const pool = require('./db');

async function acceptPendingRequests() {
  try {
    const [requests] = await pool.query('SELECT * FROM friend_requests WHERE status = $1', ['pending']);
    console.log(`Found ${requests.length} pending requests.`);
    
    for (const req of requests) {
      await pool.query('DELETE FROM friend_requests WHERE id = $1', [req.id]);
      await pool.query(`
        INSERT INTO friendships (user_one_id, user_two_id) 
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [req.sender_id, req.receiver_id]);
      console.log(`✅ Accepted request from user ${req.sender_id} to user ${req.receiver_id}`);
    }
    
    console.log('Finished processing requests.');
  } catch (err) {
    console.error('Error accepting requests:', err);
  } finally {
    process.exit(0);
  }
}

acceptPendingRequests();
