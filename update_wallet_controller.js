const fs = require('fs');
const file = 'controllers/walletController.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        await pool.query(
          \`INSERT INTO wallets (user_id, coin_balance) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET coin_balance = wallets.coin_balance + $2\`,
          [order.user_id, order.coins]
        );
        await pool.query('COMMIT');
      } catch (txErr) {`;

const replacementStr = `        await pool.query(
          \`INSERT INTO wallets (user_id, coin_balance) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET coin_balance = wallets.coin_balance + $2\`,
          [order.user_id, order.coins]
        );
        await pool.query('COMMIT');
        
        // Notify user via WebSocket
        const io = req.app.get('io');
        if (io) {
          io.to(\`user_\${userId}\`).emit('wallet_update', { coins_added: order.coins });
        }
      } catch (txErr) {`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync(file, content);
console.log("Backend walletController updated!");
