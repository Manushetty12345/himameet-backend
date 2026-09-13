const fs = require('fs');
const file = 'controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `      if (action === 'approved') {
        await pool.query(\`UPDATE users SET user_role = 'creator' WHERE id = $1\`, [app.user_id]);
      }`,
  `      if (action === 'approved') {
        await pool.query(\`UPDATE users SET user_role = 'creator', is_verified = true WHERE id = $1\`, [app.user_id]);
      }`
);

fs.writeFileSync(file, content);
console.log("Done!");
