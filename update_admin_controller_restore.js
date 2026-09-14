const fs = require('fs');
const file = 'controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

// Inside updateUserStatus:
// if (account_status === 'warned') { ... }
// await pool.query(`UPDATE users SET account_status = $1 WHERE id = $2`, [account_status, userId]);

content = content.replace(
  /if \(account_status === 'warned'\) \{[\s\S]*?\}\s*await pool\.query\(`UPDATE users SET account_status = \$1 WHERE id = \$2`, \[account_status, userId\]\);/,
  `if (account_status === 'warned') {
        const warningReason = reason || 'Violated Community Guidelines';
        await pool.query(
          \`INSERT INTO user_warnings (user_id, reason, issued_by_admin_id) VALUES ($1, $2, $3)\`,
          [userId, warningReason, req.admin ? req.admin.id : null]
        );
      } else if (account_status === 'good_standing') {
        // Clear all warnings if user is restored
        await pool.query(\`DELETE FROM user_warnings WHERE user_id = $1\`, [userId]);
      }

      await pool.query(\`UPDATE users SET account_status = $1 WHERE id = $2\`, [account_status, userId]);`
);

fs.writeFileSync(file, content);
console.log("adminController.js updated successfully for clearing warnings!");
