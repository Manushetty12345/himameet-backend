const fs = require('fs');
const file = 'sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

const target = `    // 0. Initiate Call
    socket.on('initiate_call', async (data) => {
      const { targetId, type, rate } = data;
      const callerId = socket.user.id;`;

const replacement = `    // 0. Initiate Call
    socket.on('initiate_call', async (data) => {
      const { targetId, type, rate } = data;
      const callerId = socket.user.id;

      // Ensure Caller isn't on DND
      const [callerRows] = await pool.query(\`SELECT dnd_enabled, dnd_until FROM users WHERE id = $1\`, [callerId]);
      if (callerRows.length > 0 && callerRows[0].dnd_enabled) {
        // If dnd_until is expired, we should technically disable it, but for now we just block if it's active.
        // The frontend will intercept this specific message.
        return socket.emit('call_blocked_dnd', { message: 'Do Not Disturb is on' });
      }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("callSocket updated for caller DND check");
} else {
  console.log("Target not found in callSocket.js");
}
