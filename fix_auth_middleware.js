const fs = require('fs');
const file = 'middleware/authMiddleware.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("require('../config/db')", "require('../db')");

fs.writeFileSync(file, content);
console.log("authMiddleware.js import fixed!");
