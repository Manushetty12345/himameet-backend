const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/routes/friendRoutes.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('/debug')) {
    content = content.replace(
      /router\.get\('\/list', authenticate, friendController\.getFriends\);/,
      `router.get('/list', authenticate, friendController.getFriends);\nrouter.get('/debug', authenticate, friendController.debugFriends);`
    );
    fs.writeFileSync(file, content);
}
console.log("SUCCESS");
