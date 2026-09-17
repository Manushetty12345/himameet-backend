const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

const s = String.fromCharCode(36);

const targetContent = "    await pool.query('DELETE FROM notification_tokens WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM user_sessions WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM transactions WHERE user_id = " + s + "1 OR creator_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM wallets WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM followers WHERE follower_id = " + s + "1 OR following_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM reports WHERE reporter_id = " + s + "1 OR reported_user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM blocked_users WHERE blocker_id = " + s + "1 OR blocked_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM call_logs WHERE caller_id = " + s + "1 OR receiver_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM creators WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM users WHERE id = " + s + "1', [userId]);";

const newContent = "    await pool.query('DELETE FROM notification_tokens WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM user_sessions WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM coin_transactions WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM wallets WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM friendships WHERE user_id1 = " + s + "1 OR user_id2 = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM friend_requests WHERE sender_id = " + s + "1 OR receiver_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM user_reports WHERE reporter_id = " + s + "1 OR reported_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM blocked_users WHERE blocker_id = " + s + "1 OR blocked_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM call_logs WHERE caller_id = " + s + "1 OR receiver_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM creator_settings WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM creator_applications WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM bank_accounts WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM withdrawal_requests WHERE user_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM pinned_chats WHERE user_id = " + s + "1 OR friend_id = " + s + "1', [userId]);\n" +
"    await pool.query('DELETE FROM users WHERE id = " + s + "1', [userId]);";

if (indexCode.indexOf(targetContent) !== -1) {
  indexCode = indexCode.split(targetContent).join(newContent);
  fs.writeFileSync('index.js', indexCode, 'utf8');
  console.log('Successfully replaced table names');
} else {
  console.log('Target content not found, perhaps due to exact string mismatch. Target:\n' + targetContent);
}
