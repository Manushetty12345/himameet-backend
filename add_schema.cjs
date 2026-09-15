const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/hima_schema_pg.sql';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('CREATE TABLE pinned_chats')) {
  content += `\n\n-- Added for pinning chats
CREATE TABLE pinned_chats (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);\n`;
  fs.writeFileSync(file, content);
  console.log("SUCCESS");
} else {
  console.log("ALREADY EXISTS");
}
