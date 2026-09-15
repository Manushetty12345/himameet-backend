const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/controllers/creatorDashboardController.js';
let content = fs.readFileSync(file, 'utf8');

const emitStr = `
      // Fire realtime socket event to all clients so they instantly see the toggle!
      const io = req.app.get('io');
      if (io) {
         io.emit('availability_changed', {
           userId: creatorId,
           call_type: call_type,
           is_online: is_online
         });
      }
      
      if (value) {
`;

if (!content.includes('availability_changed')) {
    content = content.replace(
      /\/\/ If changing to TRUE \(available\), fire push notifications to subscribers\n\s*if \(value\) \{/,
      emitStr
    );
    fs.writeFileSync(file, content);
}
console.log("SUCCESS");
