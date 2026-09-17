const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

const targetContent =     await pool.query('DELETE FROM notification_tokens WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM user_sessions WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM transactions WHERE user_id = \\ OR creator_id = \\', [userId]);
    await pool.query('DELETE FROM wallets WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM followers WHERE follower_id = \\ OR following_id = \\', [userId]);
    await pool.query('DELETE FROM reports WHERE reporter_id = \\ OR reported_user_id = \\', [userId]);
    await pool.query('DELETE FROM blocked_users WHERE blocker_id = \\ OR blocked_id = \\', [userId]);
    await pool.query('DELETE FROM call_logs WHERE caller_id = \\ OR receiver_id = \\', [userId]);
    await pool.query('DELETE FROM creators WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM users WHERE id = \\', [userId]);;

const newContent =     await pool.query('DELETE FROM notification_tokens WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM user_sessions WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM coin_transactions WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM wallets WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM friendships WHERE user_id1 = \\ OR user_id2 = \\', [userId]);
    await pool.query('DELETE FROM friend_requests WHERE sender_id = \\ OR receiver_id = \\', [userId]);
    await pool.query('DELETE FROM user_reports WHERE reporter_id = \\ OR reported_id = \\', [userId]);
    await pool.query('DELETE FROM blocked_users WHERE blocker_id = \\ OR blocked_id = \\', [userId]);
    await pool.query('DELETE FROM call_logs WHERE caller_id = \\ OR receiver_id = \\', [userId]);
    await pool.query('DELETE FROM creator_settings WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM creator_applications WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM bank_accounts WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM withdrawal_requests WHERE user_id = \\', [userId]);
    await pool.query('DELETE FROM pinned_chats WHERE user_id = \\ OR friend_id = \\', [userId]);
    await pool.query('DELETE FROM users WHERE id = \\', [userId]);;

if (indexCode.includes(targetContent)) {
  indexCode = indexCode.replace(targetContent, newContent);
  fs.writeFileSync('index.js', indexCode, 'utf8');
  console.log('Successfully replaced table names');
} else {
  console.log('Target content not found, perhaps due to exact string mismatch');
}
