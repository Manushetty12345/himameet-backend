const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

const oldDeletes = 
    await pool.query('DELETE FROM notification_tokens WHERE user_id = \\\', [userId]);
    await pool.query('DELETE FROM user_sessions WHERE user_id = \\\', [userId]);
    await pool.query('DELETE FROM transactions WHERE user_id = \\\ OR creator_id = \\\', [userId]);
    await pool.query('DELETE FROM wallets WHERE user_id = \\\', [userId]);
    await pool.query('DELETE FROM followers WHERE follower_id = \\\ OR following_id = \\\', [userId]);
    await pool.query('DELETE FROM reports WHERE reporter_id = \\\ OR reported_user_id = \\\', [userId]);
    await pool.query('DELETE FROM blocked_users WHERE blocker_id = \\\ OR blocked_id = \\\', [userId]);
    await pool.query('DELETE FROM call_logs WHERE caller_id = \\\ OR receiver_id = \\\', [userId]);
    await pool.query('DELETE FROM creators WHERE user_id = \\\', [userId]);
    await pool.query('DELETE FROM users WHERE id = \\\', [userId]);
.trim();

const newDeletes = 
    await pool.query('DELETE FROM notification_tokens WHERE user_id = ', [userId]);
    await pool.query('DELETE FROM user_sessions WHERE user_id = ', [userId]);
    await pool.query('DELETE FROM coin_transactions WHERE user_id = ', [userId]);
    await pool.query('DELETE FROM wallets WHERE user_id = ', [userId]);
    await pool.query('DELETE FROM friendships WHERE user_id1 =  OR user_id2 = ', [userId]);
    await pool.query('DELETE FROM friend_requests WHERE sender_id =  OR receiver_id = ', [userId]);
    await pool.query('DELETE FROM user_reports WHERE reporter_id =  OR reported_id = ', [userId]);
    await pool.query('DELETE FROM blocked_users WHERE blocker_id =  OR blocked_id = ', [userId]);
    await pool.query('DELETE FROM call_logs WHERE caller_id =  OR receiver_id = ', [userId]);
    await pool.query('DELETE FROM creator_settings WHERE user_id = ', [userId]);
    await pool.query('DELETE FROM creator_applications WHERE user_id = ', [userId]);
    await pool.query('DELETE FROM bank_accounts WHERE user_id = ', [userId]);
    await pool.query('DELETE FROM withdrawal_requests WHERE user_id = ', [userId]);
    await pool.query('DELETE FROM pinned_chats WHERE user_id =  OR friend_id = ', [userId]);
    
    // Delete user
    await pool.query('DELETE FROM users WHERE id = ', [userId]);
.trim();

// Just use split/join since we don't have to worry about regex escaping.
const parts = indexCode.split("await pool.query('DELETE FROM notification_tokens");
if (parts.length > 1) {
  const parts2 = parts[1].split("await pool.query('DELETE FROM users WHERE id = ', [userId]);");
  indexCode = parts[0] + newDeletes + parts2[1];
  fs.writeFileSync('index.js', indexCode, 'utf8');
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the block");
}
