const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

indexCode = indexCode.replace(/user_id1 = \\ OR user_id2 = \\/g, 'user_one_id = \\ OR user_two_id = \\');

fs.writeFileSync('index.js', indexCode, 'utf8');
