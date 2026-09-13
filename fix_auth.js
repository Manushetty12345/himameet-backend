const fs = require('fs');
const file = 'controllers/authController.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /const user = rows\[0\];\s*return res\.status\(200\)\.json\(\{\s*status: 'success',\s*data: \{\s*is_new_user: false,\s*profile_setup_complete: user\.profile_setup_complete \?\? true,\s*user: \{/g;

const matches = content.match(regex);
if (!matches) {
    console.log("No matches found!");
    process.exit(1);
}

// Ensure we only replace the one inside checkSession
const checkSessionIndex = content.indexOf('exports.checkSession');
const targetIndex = content.indexOf('const user = rows[0];', checkSessionIndex);

const replacement = `const user = rows[0];

        let application_status = null;
        if (user.user_role === 'creator') {
          const [appRows] = await pool.query(
            \`SELECT status FROM creator_applications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1\`,
            [decoded.id]
          );
          if (appRows.length > 0) application_status = appRows[0].status;
        }

        return res.status(200).json({
          status: 'success',
          data: {
            is_new_user: false,
            profile_setup_complete: user.profile_setup_complete ?? true,
            application_status,
            user: {`;

content = content.substring(0, targetIndex) + replacement + content.substring(targetIndex + matches[matches.length-1].length);

fs.writeFileSync(file, content);
console.log("Successfully replaced!");
