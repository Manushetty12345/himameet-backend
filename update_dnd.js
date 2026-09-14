const fs = require('fs');
const file = 'controllers/userProfileController.js';
let content = fs.readFileSync(file, 'utf8');

const target = `  exports.toggleDnd = async (req, res) => {
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

const replacement = `  exports.toggleDnd = async (req, res) => {
    try {
      const userId = req.user.id;
      const { enabled } = req.body;
  
      let result;
      if (enabled) {
        const [rows] = await pool.query(\`UPDATE users SET dnd_enabled = true, dnd_until = NOW() + INTERVAL '1 hour' WHERE id = $1 RETURNING dnd_until\`, [userId]);
        result = rows[0]?.dnd_until;
      } else {
        await pool.query(\`UPDATE users SET dnd_enabled = false, dnd_until = NULL WHERE id = $1\`, [userId]);
        result = null;
      }
  
      res.status(200).json({
        status: 'success',
        message: 'DND status updated.',
        dnd_until: result
      });
    } catch (error) {
      console.error('Error toggling DND:', error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  };`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Updated!");
