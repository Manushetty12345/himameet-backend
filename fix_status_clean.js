const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `exports.getTickets = async (req, res) => {
    try {
      const [rows] = await pool.query(\`
        SELECT st.*, u.full_name, u.phone_number
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        WHERE st.status = 'active'
        ORDER BY st.created_at DESC
      \`);`;

const replacementStr = `exports.getTickets = async (req, res) => {
    try {
      const statusFilter = req.query.status || 'active';
      const [rows] = await pool.query(\`
        SELECT st.*, u.full_name, u.phone_number
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        WHERE st.status = $1
        ORDER BY st.created_at DESC
      \`, [statusFilter]);`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content);
  console.log("adminController.js updated successfully.");
} else {
  console.log("Target string not found!");
}
