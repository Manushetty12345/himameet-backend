const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/routes/adminRoutes.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /router\.put\('\/users\/:userId\/rates', adminController\.updateCreatorRates\);/;
const replacement = `
// Global Settings
router.get('/global-rates', adminController.getGlobalRates);
router.put('/global-rates', adminController.updateGlobalRates);
`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content);
console.log("SUCCESS");
