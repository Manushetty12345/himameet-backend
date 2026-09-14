const fs = require('fs');
const file = 'db.js';
let content = fs.readFileSync(file, 'utf8');

const target = `await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false');`;

const replacement = `await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS dnd_until TIMESTAMP WITH TIME ZONE');`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Migration added to db.js");
} else {
  console.log("Could not find target in db.js");
}
