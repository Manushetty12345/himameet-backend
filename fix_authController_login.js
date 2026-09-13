const fs = require('fs');
const file = 'controllers/authController.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = `    if (rows.length > 0) {
      // Existing User
      const user = rows[0];
      const token = jwt.sign({ id: user.id, role: user.user_role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          is_new_user: false,
          token,
          user: {
            id: user.id,
            role: user.user_role,
            name: user.full_name,
            phone_number: user.phone_number
          }
        }
      });`;

const replacement1 = `    if (rows.length > 0) {
      // Existing User
      const user = rows[0];
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
      });`;

const target2 = `    if (rows.length > 0) {
      const user = rows[0];
      const token = jwt.sign({ id: user.id, role: user.user_role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return res.status(200).json({
        status: 'success',
        message: 'Truecaller Login successful',
        data: {
          is_new_user: false,
          token,
          user: {
            id: user.id,
            role: user.user_role,
            name: user.full_name,
            phone_number: user.phone_number
          }
        }
      });`;

const replacement2 = `    if (rows.length > 0) {
      const user = rows[0];
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
      });`;

if (!content.includes(target1)) console.log("Target 1 not found");
if (!content.includes(target2)) console.log("Target 2 not found");

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
fs.writeFileSync(file, content);
console.log("Successfully replaced authController endpoints");
