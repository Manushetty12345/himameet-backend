const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

const s = `
    await pool.query('DELETE FROM online_notify_subscriptions WHERE subscriber_id = $1 OR target_user_id = $1', [userId]);
    await pool.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_user_id = $1', [userId]);
    await pool.query('DELETE FROM user_warnings WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM account_deletion_requests WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM support_ticket_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = $1) OR sender_id = $1', [userId]).catch(() => {});
    await pool.query('DELETE FROM support_tickets WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);`;

indexCode = indexCode.split("await pool.query('DELETE FROM users WHERE id = $1', [userId]);").join(s);

fs.writeFileSync('index.js', indexCode, 'utf8');
console.log('Fixed missing foreign key deletes again');
