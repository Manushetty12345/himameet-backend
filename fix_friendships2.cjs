const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

indexCode = indexCode.split('DELETE FROM friendships WHERE user_id1 =  OR user_id2 = ').join('DELETE FROM friendships WHERE user_one_id =  OR user_two_id = ');

fs.writeFileSync('index.js', indexCode, 'utf8');
console.log('Fixed user_one_id');
