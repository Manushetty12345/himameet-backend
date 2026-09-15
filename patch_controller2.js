const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/creatorDashboardController.js';
let content = fs.readFileSync(file, 'utf8');

const target = `const [creatorRows] = await pool.query('SELECT full_name, avatar_url FROM users WHERE id = $1', [creatorId]);`;
const replacement = `const [creatorRows] = await pool.query('SELECT u.full_name, a.avatar_url FROM users u LEFT JOIN avatars a ON u.avatar_id = a.id WHERE u.id = $1', [creatorId]);`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("creatorDashboardController.js patched with join avatars!");
