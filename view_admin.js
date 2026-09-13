const fs = require('fs');
const content = fs.readFileSync('controllers/adminController.js', 'utf8');
const start = content.indexOf('exports.getUsers =');
console.log(content.substring(start, start + 1000));
