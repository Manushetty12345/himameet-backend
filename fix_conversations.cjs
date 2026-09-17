const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

const s = `
    await pool.query('UPDATE conversations SET last_message_id = NULL WHERE user_one_id = $1 OR user_two_id = $1', [userId]);
    await pool.query('DELETE FROM messages WHERE sender_id = $1 OR conversation_id IN (SELECT id FROM conversations WHERE user_one_id = $1 OR user_two_id = $1)', [userId]);
    await pool.query('DELETE FROM conversations WHERE user_one_id = $1 OR user_two_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);`;

indexCode = indexCode.replace("await pool.query('DELETE FROM users WHERE id = $1', [userId]);", s);

fs.writeFileSync('index.js', indexCode, 'utf8');
