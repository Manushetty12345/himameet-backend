const fs = require('fs');
const file = 'controllers/userProfileController.js';
let content = fs.readFileSync(file, 'utf8');

// Find and replace using a regex to handle CRLF/LF differences
const newFunc = `/**
 * 10.5 Toggle DND
 */
exports.toggleDnd = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled } = req.body;

    let dnd_until = null;
    if (enabled) {
      const [rows] = await pool.query(
        \`UPDATE users SET dnd_enabled = true, dnd_until = NOW() + INTERVAL '1 hour' WHERE id = $1 RETURNING dnd_until\`,
        [userId]
      );
      dnd_until = rows.length > 0 ? rows[0].dnd_until : null;
    } else {
      await pool.query(\`UPDATE users SET dnd_enabled = false, dnd_until = NULL WHERE id = $1\`, [userId]);
    }

    res.status(200).json({
      status: 'success',
      message: 'DND status updated.',
      dnd_until
    });
  } catch (error) {
    console.error('Error toggling DND:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};`;

// Use regex to match the toggleDnd block regardless of whitespace style
content = content.replace(
  /\/\*\*\s*\n\s*\*\s*10\.5 Toggle DND\s*\n\s*\*\/\s*\nexports\.toggleDnd[\s\S]*?^};/m,
  newFunc
);

fs.writeFileSync(file, content);
console.log("toggleDnd fixed!");
