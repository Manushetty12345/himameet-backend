const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/routes/adminRoutes.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /router\.put\('\/users\/:userId\/status', adminController\.updateUserStatus\);/,
  "router.put('/users/:userId/status', adminController.updateUserStatus);\nrouter.put('/users/:userId/rates', adminController.updateCreatorRates);"
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
