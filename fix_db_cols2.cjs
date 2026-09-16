const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/controllers/feedController.js';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/COALESCE\(cs\.call_rate, /g, 'COALESCE(cs.voice_rate_per_min, ');
  content = content.replace(/COALESCE\(cs\.video_rate, /g, 'COALESCE(cs.video_rate_per_min, ');
  fs.writeFileSync(file, content);
  console.log("SUCCESS feedController");
}
