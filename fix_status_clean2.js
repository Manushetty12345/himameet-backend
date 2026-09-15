const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = "WHERE st.status = 'active'";
const replace1 = "WHERE st.status = $1";

const target2 = "const [rows] = await pool.query(`\n        SELECT st.*, u.full_name, u.phone_number\n        FROM support_tickets st";
const replace2 = "const statusFilter = req.query.status || 'active';\n      const [rows] = await pool.query(`\n        SELECT st.*, u.full_name, u.phone_number\n        FROM support_tickets st";

const target3 = "ORDER BY st.created_at DESC\n      `);";
const replace3 = "ORDER BY st.created_at DESC\n      `, [statusFilter]);";

content = content.replace(target1, replace1).replace(target2, replace2).replace(target3, replace3);
fs.writeFileSync(file, content);
console.log("adminController.js updated.");
