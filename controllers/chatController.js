const pool = require('../db');

/**
 * 7.4 Clear / Delete Chat
 */
exports.clearChat = async (req, res) => {
  try {
    const chatId = req.params.chat_id;
    const userId = req.user.id;

    await pool.query(`UPDATE messages SET is_deleted = true WHERE conversation_id = $1`, [chatId]);

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
        status,
        created_at AS timestamp
      FROM messages
      WHERE conversation_id = $1 AND is_deleted = false
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
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

/**
 * 7.6 Get or Create Conversation
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.target_user_id;

    let [convRows] = await pool.query(`
      SELECT id FROM conversations 
      WHERE (user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1)
    `, [userId, targetUserId]);

    let conversationId;

    if (convRows.length > 0) {
      conversationId = convRows[0].id;
    } else {
      const [insertRes] = await pool.query(`
        INSERT INTO conversations (user_one_id, user_two_id) 
        VALUES ($1, $2) RETURNING id
      `, [userId, targetUserId]);
      conversationId = insertRes[0].id;
    }

    res.status(200).json({
      status: 'success',
      data: { conversation_id: conversationId }
    });
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};
