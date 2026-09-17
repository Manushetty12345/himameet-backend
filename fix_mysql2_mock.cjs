const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

indexCode = indexCode.replace(/const \{ rows \} = await pool\.query/g, 'const [rows] = await pool.query');

fs.writeFileSync('index.js', indexCode, 'utf8');
