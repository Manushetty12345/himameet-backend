const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/utils/fcmService.js';
let content = fs.readFileSync(file, 'utf8');

const target = `    let bodyText = \`\${creatorData.name} is online!\`;
    if (creatorData.availableFor === 'both') {
      bodyText = \`\${creatorData.name} is online and available for both!\`;
    } else if (creatorData.availableFor === 'audio') {
      bodyText = \`\${creatorData.name} is online and available for call!\`;
    } else if (creatorData.availableFor === 'video') {
      bodyText = \`\${creatorData.name} is online and available for video call!\`;
    }

    const message = {
      token: rows[0].fcm_token,
      notification: {
        title: 'Creator Online',
        body: bodyText,
      },`;
      
const replacement = `    let bodyText = "She's ready for audio & video calls. Don't miss out!";
    if (creatorData.availableFor === 'both') {
      bodyText = "She's ready for audio & video calls. Don't miss out!";
    } else if (creatorData.availableFor === 'audio') {
      bodyText = "She's ready for audio calls. Don't miss out!";
    } else if (creatorData.availableFor === 'video') {
      bodyText = "She's ready for video calls. Don't miss out!";
    }

    const message = {
      token: rows[0].fcm_token,
      notification: {
        title: \`\${creatorData.name} is online!\`,
        body: bodyText,
      },`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("fcmService.js patched with new text!");
