const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/routes/friendRoutes.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('/pin')) {
  content = content.replace(
    /module\.exports = router;/,
    `// 7.9 Toggle Pin
router.post('/:friend_id/pin', protect, friendController.togglePin);

module.exports = router;`
  );
  fs.writeFileSync(file, content);
  console.log("SUCCESS");
} else {
  console.log("ALREADY EXISTS");
}
