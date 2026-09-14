const fs = require('fs');
const file = 'controllers/userProfileController.js';
let content = fs.readFileSync(file, 'utf8');

const oldFunc = `  exports.toggleDnd = async (req, res) => {
    try {
      const userId = req.user.id;
      const { enabled } = req.body;
  
      await pool.query(\`UPDATE users SET dnd_enabled = $1 WHERE id = $2\`, [enabled ? true : false, userId]);
  
      res.status(200).json({
        status: 'success',
        message: 'DND status updated.'
      });
    } catch (error) {
      console.error('Error toggling DND:', error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  };`;

const newFunc = `  exports.toggleDnd = async (req, res) => {
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

if (content.includes(oldFunc)) {
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync(file, content);
  console.log("Old toggleDnd replaced with new dnd_until version!");
} else {
  console.log("Could not find old function - checking content...");
  const idx = content.indexOf('exports.toggleDnd');
  console.log("Found at index:", idx);
  console.log("Context:", content.substring(idx, idx + 200));
}
