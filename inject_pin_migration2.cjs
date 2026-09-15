const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/db.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('CREATE TABLE IF NOT EXISTS pinned_chats')) {
  const injection = `
        await client.query(\`
          CREATE TABLE IF NOT EXISTS pinned_chats (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, friend_id)
          );
        \`);
        console.log('? Migration: ensured pinned_chats table exists');
  `;
  content = content.replace(
    /await client\.query\('ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS receiver_deleted BOOLEAN DEFAULT false'\);/,
    "await client.query('ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS receiver_deleted BOOLEAN DEFAULT false');\n" + injection
  );
  fs.writeFileSync(file, content);
  console.log("SUCCESS");
} else {
  console.log("ALREADY EXISTS");
}
