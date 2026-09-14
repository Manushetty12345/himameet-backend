const fs = require('fs');
const file = 'controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

// The updateUserStatus function looks like this:
// exports.updateUserStatus = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { account_status } = req.body;
//     ...
//     await pool.query(`UPDATE users SET account_status = $1 WHERE id = $2`, [account_status, userId]);

content = content.replace(
  /exports\.updateUserStatus = async \(req, res\) => \{[\s\S]*?await pool\.query\(`UPDATE users SET account_status = \$1 WHERE id = \$2`, \[account_status, userId\]\);/,
  `exports.updateUserStatus = async (req, res) => {
    try {
      const { userId } = req.params;
      const { account_status, reason } = req.body;
  
      const valid = ['good_standing', 'warned', 'suspended', 'banned'];
      if (!valid.includes(account_status)) {
        return res.status(400).json({ status: 'error', message: 'Invalid status' });
      }

      // If issuing a warning, insert it into user_warnings table
      if (account_status === 'warned') {
        const warningReason = reason || 'Violated Community Guidelines';
        await pool.query(
          \`INSERT INTO user_warnings (user_id, reason, issued_by_admin_id) VALUES ($1, $2, $3)\`,
          [userId, warningReason, req.admin ? req.admin.id : null]
        );
      }
  
      await pool.query(\`UPDATE users SET account_status = $1 WHERE id = $2\`, [account_status, userId]);`
);

fs.writeFileSync(file, content);
console.log("adminController.js updated successfully!");
