const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /const \[walletRows\] = await pool\.query\(`SELECT coin_balance FROM wallets WHERE user_id =\s*$/m;
const replacementStr = "const [walletRows] = await pool.query(`SELECT coin_balance FROM wallets WHERE user_id = $1`, [callerId]);";

content = content.replace(regex, replacementStr);
fs.writeFileSync(file, content);
console.log("Fixed syntax error");
