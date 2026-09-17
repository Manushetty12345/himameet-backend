const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

indexCode = indexCode.replace(/await pool\.query\('DELETE FROM transactions WHERE user_id = \\ OR creator_id = \\', \[userId\]\);/g, "await pool.query('DELETE FROM coin_transactions WHERE user_id = \\', [userId]);");
indexCode = indexCode.replace(/await pool\.query\('DELETE FROM followers WHERE follower_id = \\ OR following_id = \\', \[userId\]\);/g, "await pool.query('DELETE FROM friendships WHERE user_id1 = \\ OR user_id2 = \\', [userId]);\n    await pool.query('DELETE FROM friend_requests WHERE sender_id = \\ OR receiver_id = \\', [userId]);");
indexCode = indexCode.replace(/await pool\.query\('DELETE FROM reports WHERE reporter_id = \\ OR reported_user_id = \\', \[userId\]\);/g, "await pool.query('DELETE FROM user_reports WHERE reporter_id = \\ OR reported_id = \\', [userId]);");
indexCode = indexCode.replace(/await pool\.query\('DELETE FROM calls WHERE caller_id = \\ OR receiver_id = \\', \[userId\]\);/g, "");
indexCode = indexCode.replace(/await pool\.query\('DELETE FROM creators WHERE user_id = \\', \[userId\]\);/g, "await pool.query('DELETE FROM creator_settings WHERE user_id = \\', [userId]);\n    await pool.query('DELETE FROM creator_applications WHERE user_id = \\', [userId]);");

// Add some more
indexCode = indexCode.replace(/await pool\.query\('DELETE FROM users WHERE id = \\', \[userId\]\);/g, "await pool.query('DELETE FROM bank_accounts WHERE user_id = \\', [userId]);\n    await pool.query('DELETE FROM withdrawal_requests WHERE user_id = \\', [userId]);\n    await pool.query('DELETE FROM pinned_chats WHERE user_id = \\ OR friend_id = \\', [userId]);\n    await pool.query('DELETE FROM users WHERE id = \\', [userId]);");

fs.writeFileSync('index.js', indexCode, 'utf8');
