const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

indexCode = indexCode.split('DELETE FROM friendships WHERE user_id1 = $1 OR user_id2 = $1').join('DELETE FROM friendships WHERE user_one_id = $1 OR user_two_id = $1');

fs.writeFileSync('index.js', indexCode, 'utf8');
console.log('Fixed user_one_id');
