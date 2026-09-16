const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /return socket\.emit\('call_blocked_insufficient_coins', \{ message: 'Insufficient coins to start call\.' \}\);/g;
const replacementStr = `return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.', requiredCoins: defaultRate });`;
// Wait, for 1-on-1 calls, defaultRate doesn't exist, it uses `rate`.
// Let's manually replace them one by one.

let replaced = content.replace(
  /if \(walletRows\.length === 0 \|\| parseFloat\(walletRows\[0\]\.coin_balance\) < rate\) \{\s*return socket\.emit\('call_blocked_insufficient_coins', \{ message: 'Insufficient coins to start call\.' \}\);\s*\}/g,
  `if (walletRows.length === 0 || parseFloat(walletRows[0].coin_balance) < rate) {
          return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.', requiredCoins: rate });
        }`
);

replaced = replaced.replace(
  /if \(walletRows\.length === 0 \|\| parseFloat\(walletRows\[0\]\.coin_balance\) < defaultRate\) \{\s*return socket\.emit\('call_blocked_insufficient_coins', \{ message: 'Insufficient coins to start call\.' \}\);\s*\}/g,
  `if (walletRows.length === 0 || parseFloat(walletRows[0].coin_balance) < defaultRate) {
          return socket.emit('call_blocked_insufficient_coins', { message: 'Insufficient coins to start call.', requiredCoins: defaultRate });
        }`
);

fs.writeFileSync(file, replaced);
console.log("SUCCESS backend");
