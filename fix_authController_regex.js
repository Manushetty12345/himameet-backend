const fs = require('fs');
const file = 'controllers/authController.js';
let content = fs.readFileSync(file, 'utf8');

// Replace target 1 (verifyOtp)
content = content.replace(
/const user = rows\[0\];\s*const token = jwt\.sign\(\{ id: user\.id, role: user\.user_role \}, JWT_SECRET, \{ expiresIn: JWT_EXPIRES_IN \}\);\s*return res\.status\(200\)\.json\(\{\s*status: 'success',\s*message: 'Login successful',\s*data: \{\s*is_new_user: false,\s*token,\s*user: \{\s*id: user\.id,\s*role: user\.user_role,\s*name: user\.full_name,\s*phone_number: user\.phone_number\s*\}\s*\}\s*\}\);/g,
`const user = rows[0];
      const token = jwt.sign({ id: user.id, role: user.user_role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      
      let application_status = null;
      if (user.user_role === 'creator') {
        const [appRows] = await pool.query(
          \`SELECT status FROM creator_applications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1\`,
          [user.id]
        );
        if (appRows.length > 0) application_status = appRows[0].status;
      }

      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          is_new_user: false,
          token,
          application_status,
          user: {
            id: user.id,
            role: user.user_role,
            name: user.full_name,
            phone_number: user.phone_number
          }
        }
      });`
);

// Replace target 2 (truecallerLogin)
content = content.replace(
/const user = rows\[0\];\s*const token = jwt\.sign\(\{ id: user\.id, role: user\.user_role \}, JWT_SECRET, \{ expiresIn: JWT_EXPIRES_IN \}\);\s*return res\.status\(200\)\.json\(\{\s*status: 'success',\s*message: 'Truecaller Login successful',\s*data: \{\s*is_new_user: false,\s*token,\s*user: \{\s*id: user\.id,\s*role: user\.user_role,\s*name: user\.full_name,\s*phone_number: user\.phone_number\s*\}\s*\}\s*\}\);/g,
`const user = rows[0];
      const token = jwt.sign({ id: user.id, role: user.user_role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      
      let application_status = null;
      if (user.user_role === 'creator') {
        const [appRows] = await pool.query(
          \`SELECT status FROM creator_applications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1\`,
          [user.id]
        );
        if (appRows.length > 0) application_status = appRows[0].status;
      }

      return res.status(200).json({
        status: 'success',
        message: 'Truecaller Login successful',
        data: {
          is_new_user: false,
          token,
          application_status,
          user: {
            id: user.id,
            role: user.user_role,
            name: user.full_name,
            phone_number: user.phone_number
          }
        }
      });`
);

fs.writeFileSync(file, content);
console.log("Successfully replaced with regex");
