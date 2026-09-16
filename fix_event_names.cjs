const fs = require('fs');
const file = 'd:/App6/hima-meet-backend/sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

// Replace call_incoming with incoming_call
content = content.replace(/'call_incoming', \{/g, "'incoming_call', {");

// Replace cancel_incoming_call with call_cancelled
content = content.replace(/'cancel_incoming_call', \{ callId \}/g, "'call_cancelled', { callId }");

fs.writeFileSync(file, content);
console.log("SUCCESS");
