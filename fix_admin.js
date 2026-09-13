const fs = require('fs');
const file = 'controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const target = "let conditions = [`(u.is_admin = false OR u.is_admin IS NULL)`];";
const replacement = "let conditions = [`(u.is_admin = false OR u.is_admin IS NULL)`, `(u.user_role != 'creator' OR u.is_verified = true)`];";

if (!content.includes(target)) {
    console.log("NOT FOUND");
    process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Replaced");
