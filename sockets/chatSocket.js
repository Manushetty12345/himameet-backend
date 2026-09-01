const socketIo = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'hima_secret_key_2026';
const CHAT_RATE_PER_MINUTE = 25;

module.exports = (server) => {
  const io = socketIo(server, {
    cors: { origin: '*' }
  });

  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis Adapter connected for WebSockets');
  }).catch((err) => {
    console.log('⚠️ Redis not found. Using default memory adapter for WebSockets.');
  });

  const activeTimers = {};

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    socket.join(`user_${socket.user.id}`);

    socket.on('join_chat', async (data) => {
      const { conversationId } = data;
      socket.join(`chat_${conversationId}`);
      console.log(`User ${socket.user.id} joined chat_${conversationId}`);

      const room = io.sockets.adapter.rooms.get(`chat_${conversationId}`);
      if (room && room.size === 2) {
        io.to(`chat_${conversationId}`).emit('chat_started', { message: 'Chat is now active. Billing started.' });
        startBillingTimer(conversationId);
      }
    });

    socket.on('send_message', async (data) => {
      const { conversationId, messageText, messageType } = data;
      const senderId = socket.user.id;

      try {
        const [result] = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, message_text, message_type) VALUES ($1, $2, $3, $4) RETURNING id`,
          [conversationId, senderId, messageText, messageType || 'text']
        );
        
        await pool.query(
          `UPDATE conversations SET last_message_id = $1, last_message_at = NOW() WHERE id = $2`,
          [result[0].id, conversationId]
        );

        io.to(`chat_${conversationId}`).emit('receive_message', {
          message_id: result[0].id,
          sender_id: senderId,
          content: messageText,
          message_type: messageType || 'text',
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    socket.on('leave_chat', (data) => {
      const { conversationId } = data;
      socket.leave(`chat_${conversationId}`);
      stopBillingTimer(conversationId);
      io.to(`chat_${conversationId}`).emit('chat_ended', { message: 'The other user left the chat.' });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  function startBillingTimer(conversationId) {
    if (activeTimers[conversationId]) return;

    console.log(`Starting billing timer for conversation ${conversationId}`);
    
    activeTimers[conversationId] = setInterval(async () => {
      try {
        const [convRows] = await pool.query(`SELECT user_one_id, user_two_id FROM conversations WHERE id = $1`, [conversationId]);
        if (convRows.length === 0) return stopBillingTimer(conversationId);
        
        const { user_one_id, user_two_id } = convRows[0];
        
        const [maleRows] = await pool.query(`SELECT id FROM users WHERE id IN ($1, $2) AND user_role != 'creator'`, [user_one_id, user_two_id]);
        if (maleRows.length === 0) return stopBillingTimer(conversationId);
        const maleId = maleRows[0].id;
        const femaleId = maleId === user_one_id ? user_two_id : user_one_id;

        const [updateRes] = await pool.query(
          `UPDATE wallets SET coin_balance = coin_balance - $1 WHERE user_id = $2 AND coin_balance >= $3 RETURNING id`, 
          [CHAT_RATE_PER_MINUTE, maleId, CHAT_RATE_PER_MINUTE]
        );

        if (updateRes.length === 0) {
          stopBillingTimer(conversationId);
          io.to(`chat_${conversationId}`).emit('insufficient_coins', { message: 'Male ran out of coins. Chat ended.' });
          io.in(`chat_${conversationId}`).socketsLeave(`chat_${conversationId}`);
          return;
        }

        await pool.query(`UPDATE wallets SET coin_balance = coin_balance + $1 WHERE user_id = $2`, [CHAT_RATE_PER_MINUTE, femaleId]);

        await pool.query(
          `INSERT INTO coin_transactions (user_id, type, coins) VALUES ($1, 'chat_spend', $2)`,
          [maleId, -CHAT_RATE_PER_MINUTE]
        );
        await pool.query(
          `INSERT INTO coin_transactions (user_id, type, coins) VALUES ($1, 'chat_earn', $2)`,
          [femaleId, CHAT_RATE_PER_MINUTE]
        );

        console.log(`Billed ${CHAT_RATE_PER_MINUTE} coins from ${maleId} to ${femaleId} for chat ${conversationId}`);

      } catch (err) {
        console.error('Billing error:', err);
      }
    }, 60000);
  }

  function stopBillingTimer(conversationId) {
    if (activeTimers[conversationId]) {
      clearInterval(activeTimers[conversationId]);
      delete activeTimers[conversationId];
      console.log(`Stopped billing timer for conversation ${conversationId}`);
    }
  }

    require('./callSocket')(io);
  return io;
};
