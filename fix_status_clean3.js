const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const regexStatus = /WHERE st\.status = 'active'/;
content = content.replace(regexStatus, "WHERE st.status = $1");

const regexQuery = /const \[rows\] = await pool\.query\(`\s+SELECT st\.\*, u\.full_name, u\.phone_number\s+FROM support_tickets st/s;
const replaceQuery = "const statusFilter = req.query.status || 'active';\n      const [rows] = await pool.query(`\n        SELECT st.*, u.full_name, u.phone_number\n        FROM support_tickets st";
content = content.replace(regexQuery, replaceQuery);

const regexEnd = /ORDER BY st\.created_at DESC\s+`\);/s;
content = content.replace(regexEnd, "ORDER BY st.created_at DESC\n      `, [statusFilter]);");

fs.writeFileSync(file, content);
console.log("adminController.js updated with flex regex.");
