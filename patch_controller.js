const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/creatorDashboardController.js';
let content = fs.readFileSync(file, 'utf8');

const target = `const [creatorRows] = await pool.query('SELECT username, avatar_url FROM users WHERE id = $1', [creatorId]);`;
const replacement = `const [creatorRows] = await pool.query('SELECT full_name, avatar_url FROM users WHERE id = $1', [creatorId]);`;

const target2 = `name: creator.username || 'Creator',`;
const replacement2 = `name: creator.full_name || 'Creator',`;

content = content.replace(target, replacement);
content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
console.log("creatorDashboardController.js patched with full_name!");
