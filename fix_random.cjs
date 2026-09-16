const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

const startMarker = "// --- BROADCAST RANDOM CALL ---";
const endMarker = "console.log('?? BACKEND: Caller has enough coins. Finding matches...');";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find markers");
    process.exit(1);
}

const replacement = `// --- BROADCAST RANDOM CALL ---
    socket.on('initiate_random_broadcast', async (data) => {
      console.log('?? BACKEND: initiate_random_broadcast called. data:', data);
      const callerId = socket.userId;
      if (!callerId) return;

      const type = data?.type || 'audio';

      try {
        // Ensure Caller isn't on DND
        const [callerRows] = await pool.query(\`SELECT dnd_enabled FROM users WHERE id = $1\`, [callerId]);
        if (callerRows.length > 0 && callerRows[0].dnd_enabled) {
          return socket.emit('call_blocked_dnd', { message: 'Do Not Disturb is on' });
        }

        // Fetch the dynamic global rates set by the admin
        const [settingRows] = await pool.query(\`SELECT key, value FROM settings WHERE key IN ('default_voice_rate', 'default_video_rate')\`);
        let globalAudioRate = 20;
        let globalVideoRate = 40;
        for (const row of settingRows) {
          if (row.key === 'default_voice_rate') globalAudioRate = parseInt(row.value, 10);
          if (row.key === 'default_video_rate') globalVideoRate = parseInt(row.value, 10);
        }

        // Check caller wallet for global rate to ensure they have minimum balance
        const defaultRate = type === 'audio' ? globalAudioRate : globalVideoRate;
        console.log('?? BACKEND: defaultRate for', type, 'is', defaultRate);
        const [walletRows] = await pool.query(\`SELECT coin_balance FROM wallets WHERE user_id = $1\`, [callerId]);
        
        let callerBalance = 0;
        if (walletRows.length > 0) {
           callerBalance = parseFloat(walletRows[0].coin_balance);
        }
        console.log('?? BACKEND: callerBalance is', callerBalance);

        if (walletRows.length === 0 || callerBalance < defaultRate) {
          console.log('?? BACKEND: Blocking call! Insufficient coins. Required:', defaultRate, 'Balance:', callerBalance);
          return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.', requiredCoins: defaultRate });
        }
        
        console.log('?? BACKEND: Caller has enough coins. Finding matches...');`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex + endMarker.length);
fs.writeFileSync(file, newContent);
console.log("Replaced cleanly!");
