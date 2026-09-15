const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const target = `exports.getTickets = async (req, res) => {
    try {
      const [rows] = await pool.query(\`
        SELECT st.*, u.full_name, u.phone_number
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        WHERE st.status = 'active'
        ORDER BY st.created_at DESC
      \`);`;

const replacement = `exports.getTickets = async (req, res) => {
    try {
      const statusFilter = req.query.status || 'active';
      const [rows] = await pool.query(\`
        SELECT st.*, u.full_name, u.phone_number
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        WHERE st.status = $1
        ORDER BY st.created_at DESC
      \`, [statusFilter]);`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("adminController.js updated for status filter!");
