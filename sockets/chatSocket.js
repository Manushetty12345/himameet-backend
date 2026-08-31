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

  // Try to connect to Redis for scaling (fallback to memory if it fails)
  const pubClient = createClient({ url: 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis Adapter connected for WebSockets');
  }).catch((err) => {
    console.log('⚠️ Redis not found. Using default memory adapter for WebSockets.');
  });

  // Active timers tracking: { conversationId: intervalId }
  const activeTimers = {};

  // Authentication Middleware
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

    // Join personal room for private notifications
    socket.join(`user_${socket.user.id}`);

    // 1. Join Chat Room
    socket.on('join_chat', async (data) => {
      const { conversationId } = data;
      socket.join(`chat_${conversationId}`);
      console.log(`User ${socket.user.id} joined chat_${conversationId}`);

      // Check how many people are in the room
      const room = io.sockets.adapter.rooms.get(`chat_${conversationId}`);
      if (room && room.size === 2) {
        // Both Male and Female are here! Start the timer!
        io.to(`chat_${conversationId}`).emit('chat_started', { message: 'Chat is now active. Billing started.' });
        startBillingTimer(conversationId);
      }
    });

    // 2. Send Message
    socket.on('send_message', async (data) => {
      const { conversationId, messageText, messageType } = data;
      const senderId = socket.user.id;

      try {
        // Save to DB
        const [result] = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, message_text, message_type) VALUES (?, ?, ?, ?)`,
          [conversationId, senderId, messageText, messageType || 'text']
        );
        
        await pool.query(
          `UPDATE conversations SET last_message_id = ?, last_message_at = NOW() WHERE id = ?`,
          [result.insertId, conversationId]
        );

        // Broadcast to the other user in the room
        io.to(`chat_${conversationId}`).emit('receive_message', {
          message_id: result.insertId,
          sender_id: senderId,
          content: messageText,
          message_type: messageType || 'text',
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    // 3. Leave Chat
    socket.on('leave_chat', (data) => {
      const { conversationId } = data;
      socket.leave(`chat_${conversationId}`);
      stopBillingTimer(conversationId);
      io.to(`chat_${conversationId}`).emit('chat_ended', { message: 'The other user left the chat.' });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
      // Ideally loop through their active rooms and stop timers if they disconnect unexpectedly
    });
  });

  // Billing Logic
  function startBillingTimer(conversationId) {
    if (activeTimers[conversationId]) return; // Already running

    console.log(`Starting billing timer for conversation ${conversationId}`);
    
    // Run every 60 seconds (60000 ms). Set to 10 seconds for easier testing if needed.
    activeTimers[conversationId] = setInterval(async () => {
      try {
        // Find the male user (user_role != 'creator') in this conversation
        const [convRows] = await pool.query(`SELECT user_one_id, user_two_id FROM conversations WHERE id = ?`, [conversationId]);
        if (convRows.length === 0) return stopBillingTimer(conversationId);
        
        const { user_one_id, user_two_id } = convRows[0];
        
        // Find who is male
        const [maleRows] = await pool.query(`SELECT id FROM users WHERE id IN (?, ?) AND user_role != 'creator'`, [user_one_id, user_two_id]);
        if (maleRows.length === 0) return stopBillingTimer(conversationId);
        const maleId = maleRows[0].id;
        const femaleId = maleId === user_one_id ? user_two_id : user_one_id;

        // Deduct from male
        const [updateRes] = await pool.query(
          `UPDATE wallets SET coin_balance = coin_balance - ? WHERE user_id = ? AND coin_balance >= ?`, 
          [CHAT_RATE_PER_MINUTE, maleId, CHAT_RATE_PER_MINUTE]
        );

        if (updateRes.affectedRows === 0) {
          // Insufficient Coins! Force end chat.
          stopBillingTimer(conversationId);
          io.to(`chat_${conversationId}`).emit('insufficient_coins', { message: 'Male ran out of coins. Chat ended.' });
          io.in(`chat_${conversationId}`).socketsLeave(`chat_${conversationId}`);
          return;
        }

        // Add to female
        await pool.query(`UPDATE wallets SET coin_balance = coin_balance + ? WHERE user_id = ?`, [CHAT_RATE_PER_MINUTE, femaleId]);

        // Log transaction (Optional but good)
        await pool.query(
          `INSERT INTO coin_transactions (user_id, type, coins) VALUES (?, 'chat_spend', -?)`,
          [maleId, CHAT_RATE_PER_MINUTE]
        );
        await pool.query(
          `INSERT INTO coin_transactions (user_id, type, coins) VALUES (?, 'chat_earn', ?)`,
          [femaleId, CHAT_RATE_PER_MINUTE]
        );

        console.log(`Billed ${CHAT_RATE_PER_MINUTE} coins from ${maleId} to ${femaleId} for chat ${conversationId}`);

      } catch (err) {
        console.error('Billing error:', err);
      }
    }, 60000); // 60 seconds
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
