const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/db.js';
let content = fs.readFileSync(file, 'utf8');

const target = `      console.log('o. Migration: ensured withdrawal_requests table exists');

      await client.query(\`
        CREATE TABLE IF NOT EXISTS creator_online_notifications (`;
    
const replacement = `      console.log('o. Migration: ensured withdrawal_requests table exists');

      await client.query(\`
        CREATE TABLE IF NOT EXISTS online_notify_subscriptions (
          id                      BIGSERIAL PRIMARY KEY,
          subscriber_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          target_user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(subscriber_id, target_user_id)
        )
      \`);
      console.log('o. Migration: ensured online_notify_subscriptions table exists');
      
      await client.query(\`
        CREATE TABLE IF NOT EXISTS creator_online_notifications (`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Injected table migration into db.js");
