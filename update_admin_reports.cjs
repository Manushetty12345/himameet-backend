const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

// Replace 'reviewed' with 'resolved'
content = content.replace(
  /UPDATE user_reports SET status = 'reviewed' WHERE id = \$1/,
  "UPDATE user_reports SET status = 'resolved' WHERE id = $1"
);

// Enhance 'warn' action to add warning record and notify user
content = content.replace(
  /if \(action === 'warn'\) \{\s*await pool\.query\(`UPDATE users SET account_status = 'warned' WHERE id = \$1`, \[reported_user_id\]\);\s*\}/,
  `if (action === 'warn') {
        await pool.query(\`UPDATE users SET account_status = 'warned' WHERE id = $1\`, [reported_user_id]);
        
        // Insert into user_warnings table for dynamic warnings
        await pool.query(
          \`INSERT INTO user_warnings (user_id, reason, issued_by_admin_id) VALUES ($1, $2, $3)\`,
          [reported_user_id, 'Violated Community Guidelines', req.user ? req.user.id : null]
        );
        
        // Notify the user dynamically
        const io = req.app.get('io');
        if (io) {
          io.to(\`user_\${reported_user_id}\`).emit('warning_received', {
            message: 'You have received a warning from the admin for violating community guidelines.'
          });
        }
      }`
);

// Ensure the ban action also kicks them dynamically if possible
content = content.replace(
  /\} else if \(action === 'ban'\) \{\s*await pool\.query\(`UPDATE users SET account_status = 'banned' WHERE id = \$1`, \[reported_user_id\]\);\s*\}/,
  `} else if (action === 'ban') {
        await pool.query(\`UPDATE users SET account_status = 'banned' WHERE id = $1\`, [reported_user_id]);
        
        // Force disconnect the user dynamically
        const io = req.app.get('io');
        if (io) {
          io.to(\`user_\${reported_user_id}\`).emit('account_banned');
        }
      }`
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
