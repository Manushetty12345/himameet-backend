const fs = require('fs');
const file = 'sockets/callSocket.js';
let content = fs.readFileSync(file, 'utf8');

const target = `      if (activeUsersInCall.has(String(targetId)) || activeUsersInCall.has(targetId)) {
        return socket.emit('call_busy', { message: 'The user is currently on another call. Please try again later.' });
      }`;

const replacement = `      // Check if user is busy or on DND
      const [targetRows] = await pool.query(\`SELECT dnd_enabled FROM users WHERE id = $1\`, [targetId]);
      if (targetRows.length > 0 && targetRows[0].dnd_enabled) {
        return socket.emit('call_busy', { message: 'This user is currently on Do Not Disturb.' });
      }

      if (activeUsersInCall.has(String(targetId)) || activeUsersInCall.has(targetId)) {
        return socket.emit('call_busy', { message: 'The user is currently on another call. Please try again later.' });
      }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("callSocket patched to enforce DND!");
