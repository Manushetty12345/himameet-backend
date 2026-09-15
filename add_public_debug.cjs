const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/routes/authRoutes.js';
let content = fs.readFileSync(file, 'utf8');

const debugRoute = `
router.get('/public/debug', async (req, res) => {
  try {
    const pool = require('../db');
    const { rows: convs } = await pool.query(\`
      SELECT c.id, c.user_one_id, c.user_two_id, c.last_message_id, m.message_text 
      FROM conversations c
      LEFT JOIN messages m ON m.id = c.last_message_id
      ORDER BY c.created_at DESC
      LIMIT 20
    \`);
    res.json({ convs });
  } catch (err) {
    res.json({ error: err.message });
  }
});
`;

if (!content.includes('/public/debug')) {
    content = content.replace(/module\.exports = router;/, debugRoute + '\nmodule.exports = router;');
    fs.writeFileSync(file, content);
}
console.log("SUCCESS");
