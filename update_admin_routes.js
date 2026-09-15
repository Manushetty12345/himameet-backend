const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/routes/adminRoutes.js';
let content = fs.readFileSync(file, 'utf8');

const target = `router.get('/tickets', adminController.getTickets);`;
const replacement = `router.get('/tickets', adminController.getTickets);
router.get('/tickets/:ticketId/messages', adminController.getTicketMessages);`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("adminRoutes.js updated!");
