const fs = require('fs');
const file = 'controllers/walletController.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /await pool\.query\('COMMIT'\);\s*\} catch \(txErr\)/g,
  `await pool.query('COMMIT');
        
        // Notify user via WebSocket
        const io = req.app.get('io');
        if (io) {
          io.to(\`user_\${userId}\`).emit('wallet_update', { coins_added: order.coins });
        }
      } catch (txErr)`
);

fs.writeFileSync(file, content);
console.log("Backend walletController updated via regex!");
