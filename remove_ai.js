const fs = require('fs');
const file = 'controllers/onboardingController.js';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '// AI Verification';
const endMarker = '} catch (aiError) {';

const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
    const catchIndex = content.indexOf(endMarker, startIndex);
    const endIndex = content.indexOf('}', catchIndex) + 1; // get the closing brace of catch block
    
    // Remove the block
    content = content.substring(0, startIndex) + content.substring(endIndex);
}

fs.writeFileSync(file, content);
