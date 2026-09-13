const fs = require('fs');
const content = fs.readFileSync('controllers/authController.js', 'utf8');
const start = content.indexOf('exports.checkSession');
console.log(content.substring(start + 1000, start + 1500));
