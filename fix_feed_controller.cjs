const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/controllers/feedController.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /u\.id AS matched_creator_id,\r?\n\s*u\.full_name AS name,\r?\n\s*a\.avatar_url/,
  `u.id AS matched_creator_id,
          u.full_name AS name,
          a.avatar_url,
          COALESCE(cs.call_rate, 20) AS call_rate,
          COALESCE(cs.video_rate, 40) AS video_rate`
);

fs.writeFileSync(file, content);
console.log("SUCCESS");
