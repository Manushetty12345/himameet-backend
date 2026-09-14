const fs = require('fs');
const file = 'controllers/userProfileController.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('u.dnd_enabled,', 'u.dnd_enabled,\n          u.dnd_until,');
fs.writeFileSync(file, content);
console.log("Updated getMyProfile");
