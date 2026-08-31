const pool = require('../db');

// Call timers tracking: { callId: intervalId }
const activeCallTimers = {};

module.exports = (io) => {
  io.on('connection', (socket) => {
    
    // 1. Join Call Room
    socket.on('join_call', async (data) => {
      const { callId } = data;
      socket.join(`call_${callId}`);
      console.log(`User ${socket.user.id} joined call_${callId}`);

      // Check how many people are in the call room
      const room = io.sockets.adapter.rooms.get(`call_${callId}`);
      if (room && room.size === 2) {
        // Both Male and Female are here! Start the billing timer!
        io.to(`call_${callId}`).emit('call_started', { message: 'Call is now active. Billing started.' });
        
        // Update DB status to ongoing
        await pool.query(`UPDATE call_logs SET status = 'ongoing', started_at = NOW() WHERE id = ?`, [callId]);
        
        startCallBillingTimer(callId, io);
      }
    });

    // 2. End Call / Leave
    socket.on('leave_call', async (data) => {
      const { callId } = data;
      socket.leave(`call_${callId}`);
      stopCallBillingTimer(callId);
      
      // Update DB
      await pool.query(`UPDATE call_logs SET status = 'completed', ended_at = NOW() WHERE id = ? AND status != 'completed'`, [callId]);
      
      io.to(`call_${callId}`).emit('call_ended', { message: 'The other user hung up.' });
    });

  });
};

function startCallBillingTimer(callId, io) {
  if (activeCallTimers[callId]) return; // Already running

  console.log(`Starting billing timer for call ${callId}`);
  
  // Run every 60 seconds (60000 ms)
  let tick = 0;
  activeCallTimers[callId] = setInterval(async () => {
    try {
      tick++;
      // Fetch call details
      const [callRows] = await pool.query(`SELECT caller_id, receiver_id, rate_per_min FROM call_logs WHERE id = ?`, [callId]);
      if (callRows.length === 0) return stopCallBillingTimer(callId);
      
      const { caller_id, receiver_id, rate_per_min } = callRows[0];
      const rate = parseFloat(rate_per_min);

      // Deduct from caller
      const [updateRes] = await pool.query(
        `UPDATE wallets SET coin_balance = coin_balance - ? WHERE user_id = ? AND coin_balance >= ?`, 
        [rate, caller_id, rate]
      );

      if (updateRes.affectedRows === 0) {
        // Insufficient Coins! Force end call.
        stopCallBillingTimer(callId);
        await pool.query(`UPDATE call_logs SET status = 'completed', end_reason = 'insufficient_coins', ended_at = NOW() WHERE id = ?`, [callId]);
        io.to(`call_${callId}`).emit('insufficient_coins', { message: 'Caller ran out of coins. Call ended.' });
        io.in(`call_${callId}`).socketsLeave(`call_${callId}`);
        return;
      }

      // Add to receiver
      await pool.query(`UPDATE wallets SET coin_balance = coin_balance + ? WHERE user_id = ?`, [rate, receiver_id]);

      // Record the tick
      await pool.query(`INSERT INTO call_billing_ticks (call_id, tick_number, coins_deducted) VALUES (?, ?, ?)`, [callId, tick, rate]);
      
      // Update total coins charged and duration in call_logs
      await pool.query(`
        UPDATE call_logs 
        SET coins_charged = coins_charged + ?, duration_seconds = duration_seconds + 60 
        WHERE id = ?
      `, [rate, callId]);

      // Log transactions
      await pool.query(`INSERT INTO coin_transactions (user_id, type, coins) VALUES (?, 'call_spend', -?)`, [caller_id, rate]);
      await pool.query(`INSERT INTO coin_transactions (user_id, type, coins) VALUES (?, 'call_earn', ?)`, [receiver_id, rate]);

      console.log(`Billed ${rate} coins for call ${callId} (Tick ${tick})`);

    } catch (err) {
      console.error('Call billing error:', err);
    }
  }, 60000); // 60 seconds
}

function stopCallBillingTimer(callId) {
  if (activeCallTimers[callId]) {
    clearInterval(activeCallTimers[callId]);
    delete activeCallTimers[callId];
    console.log(`Stopped billing timer for call ${callId}`);
  }
}
