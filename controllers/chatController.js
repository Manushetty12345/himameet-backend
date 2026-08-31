const pool = require('../db');

/**
 * 7.4 Clear / Delete Chat
 */
exports.clearChat = async (req, res) => {
  try {
    const chatId = req.params.chat_id;
    const userId = req.user.id;

    // Soft delete by marking messages as deleted (or a mapping table for per-user delete)
    // For simplicity based on schema:
    await pool.query(`UPDATE messages SET is_deleted = 1 WHERE conversation_id = ?`, [chatId]);

    res.status(200).json({
      status: 'success',
      message: 'Chat history cleared.'
    });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 7.5 Get Chat Messages (History)
 */
exports.getMessages = async (req, res) => {
  try {
    const chatId = req.params.chat_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(`
      SELECT 
        id AS message_id,
        sender_id,
        message_text AS content,
        message_type,
        created_at AS timestamp
      FROM messages
      WHERE conversation_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [chatId, limit, offset]);

    res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
