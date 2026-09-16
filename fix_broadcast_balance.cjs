const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        // Check caller wallet for default rate (20/40) to ensure they have minimum balance
        const defaultRate = type === 'audio' ? 20 : 40;
        const [walletRows] = await pool.query(\`SELECT coin_balance FROM wallets WHERE user_id = $1\`, [callerId]);
        if (walletRows.length === 0 || parseFloat(walletRows[0].coin_balance) < defaultRate) {
          return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.' });
        }`;

const replacementStr = `        // Fetch the dynamic global rates set by the admin
        const [settingRows] = await pool.query(\`SELECT key, value FROM settings WHERE key IN ('default_voice_rate', 'default_video_rate')\`);
        let globalAudioRate = 20;
        let globalVideoRate = 40;
        for (const row of settingRows) {
          if (row.key === 'default_voice_rate') globalAudioRate = parseInt(row.value, 10);
          if (row.key === 'default_video_rate') globalVideoRate = parseInt(row.value, 10);
        }
        
        // Check caller wallet for global rate to ensure they have minimum balance
        const defaultRate = type === 'audio' ? globalAudioRate : globalVideoRate;
        const [walletRows] = await pool.query(\`SELECT coin_balance FROM wallets WHERE user_id = $1\`, [callerId]);
        if (walletRows.length === 0 || parseFloat(walletRows[0].coin_balance) < defaultRate) {
          return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.' });
        }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log("SUCCESS backend");
