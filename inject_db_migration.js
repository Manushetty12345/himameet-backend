const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/db.js';
let content = fs.readFileSync(file, 'utf8');

const target = `      console.log('o. Migration: ensured withdrawal_requests table exists');
    } catch (e) {`;
    
const replacement = `      console.log('o. Migration: ensured withdrawal_requests table exists');

      await client.query(\`
        CREATE TABLE IF NOT EXISTS creator_online_notifications (
          id                      BIGSERIAL PRIMARY KEY,
          user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          creator_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, creator_id)
        )
      \`);
      console.log('o. Migration: ensured creator_online_notifications table exists');
    } catch (e) {`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Injected table migration into db.js");
