const fs = require('fs');
const file = 'middleware/authMiddleware.js';
let content = fs.readFileSync(file, 'utf8');

const target = `      // Strict Ban Check
      const [userRows] = await pool.query(\`SELECT account_status FROM users WHERE id = $1\`, [decoded.id]);
      if (userRows.length === 0) {
        return res.status(401).json({ status: 'error', message: 'User not found' });
      }
      if (userRows[0].account_status === 'banned') {
        return res.status(403).json({ status: 'error', message: 'ACCOUNT_BANNED' });
      }`;

const replacement = `      // Strict Ban Check (Only for permanent tokens that have an ID)
      if (decoded.id) {
        const [userRows] = await pool.query(\`SELECT account_status FROM users WHERE id = $1\`, [decoded.id]);
        if (userRows.length === 0) {
          return res.status(401).json({ status: 'error', message: 'User not found' });
        }
        if (userRows[0].account_status === 'banned') {
          return res.status(403).json({ status: 'error', message: 'ACCOUNT_BANNED' });
        }
      }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("authMiddleware patched to support temp tokens!");
