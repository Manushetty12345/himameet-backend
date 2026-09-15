const fs = require('fs');
const file = 'D:/App6/hima-meet-backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

const targetReply = `exports.replyTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    await pool.query(\`
      INSERT INTO support_ticket_messages (ticket_id, sender_type, message)
      VALUES ($1, 'admin', $2)
    \`, [ticketId, message]);

    res.json({ status: 'success', message: 'Reply sent' });
  } catch (err) {`;

const replacementReply = `exports.replyTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    const [rows] = await pool.query(\`
      INSERT INTO support_ticket_messages (ticket_id, sender_type, message)
      VALUES ($1, 'admin', $2) RETURNING *
    \`, [ticketId, message]);

    res.json({ status: 'success', message: 'Reply sent', data: rows[0] });
  } catch (err) {`;

const newFunc = `
exports.getTicketMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const [rows] = await pool.query(\`
      SELECT id, sender_type, message, created_at 
      FROM support_ticket_messages 
      WHERE ticket_id = $1 
      ORDER BY created_at ASC
    \`, [ticketId]);

    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[getTicketMessages] Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.replyTicket =`;

content = content.replace(targetReply, replacementReply);
content = content.replace('exports.replyTicket =', newFunc);

fs.writeFileSync(file, content);
console.log("adminController.js updated!");
