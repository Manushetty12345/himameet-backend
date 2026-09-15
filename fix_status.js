const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /WHERE st\.status = 'active'/g;
content = content.replace(regex, "WHERE st.status = $1");

const queryStart = /const \[rows\] = await pool\.query\(\`/g;
const statusFilterCode = "const statusFilter = req.query.status || 'active';\n      const [rows] = await pool.query(`";
content = content.replace(queryStart, statusFilterCode);

const queryEndRegex = /`\);/g;
content = content.replace(queryEndRegex, "`, [statusFilter]);");

fs.writeFileSync(file, content);
console.log("Replaced with regex");
