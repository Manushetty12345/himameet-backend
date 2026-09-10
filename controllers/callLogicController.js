const pool = require('../db');

exports.sendGift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { giftId } = req.body;

    const defaultGifts = [
      { id: 'rose', price: 10 },
      { id: 'coffee', price: 25 },
      { id: 'heart', price: 50 },
      { id: 'diamond', price: 100 },
      { id: 'crown', price: 500 }
    ];
    
    const foundGift = defaultGifts.find(g => g.id === giftId);
    if (!foundGift) {
      return res.status(404).json({ status: 'error', message: 'Gift not found' });
    }
    const giftPrice = foundGift.price;

    const [walletRows] = await pool.query('SELECT coin_balance FROM wallets WHERE user_id = $1', [userId]);
    const balance = walletRows.length > 0 ? walletRows[0].coin_balance : 0;

    if (balance < giftPrice) {
      return res.status(400).json({ status: 'error', message: 'Insufficient coins' });
    }

    await pool.query('UPDATE wallets SET coin_balance = coin_balance - $1 WHERE user_id = $2', [giftPrice, userId]);

    // Optional: Log the transaction if there is a transactions table

    res.json({ status: 'success', message: 'Gift sent successfully' });
  } catch (err) {
    console.error('Error sending gift:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { callId } = req.body;

    const [callRows] = await pool.query('SELECT rate_per_min FROM call_logs WHERE id = $1', [callId]);
    if (callRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Call not found' });
    }
    const costPerMin = callRows[0].rate_per_min;

    const [walletRows] = await pool.query('SELECT coin_balance FROM wallets WHERE user_id = $1', [userId]);
    const balance = walletRows.length > 0 ? walletRows[0].coin_balance : 0;

    if (balance < costPerMin) {
      return res.status(400).json({ status: 'error', message: 'Insufficient coins' });
    }

    await pool.query('UPDATE wallets SET coin_balance = coin_balance - $1 WHERE user_id = $2', [costPerMin, userId]);

    // Give coins to the receiver
    const [receiverRows] = await pool.query('SELECT receiver_id FROM call_logs WHERE id = $1', [callId]);
    if (receiverRows.length > 0) {
      const receiverId = receiverRows[0].receiver_id;
      // Taking a platform cut could happen here, let's just give full amount or maybe 80%? 
      // The requirement doesn't specify, we will just add it directly.
      await pool.query('UPDATE wallets SET coin_balance = coin_balance + $1 WHERE user_id = $2', [costPerMin, receiverId]);
    }

    res.json({ status: 'success', message: 'Heartbeat successful' });
  } catch (err) {
    console.error('Error in call heartbeat:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const userId = req.user.id;
    const { callId, creatorId, rating, likeText, comments } = req.body;

    if (!creatorId || rating === undefined) {
      return res.status(400).json({ status: 'error', message: 'creatorId and rating are required' });
    }

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS call_feedback (
        id SERIAL PRIMARY KEY,
        call_id INTEGER NULL,
        user_id INTEGER NOT NULL,
        creator_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        like_text TEXT,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert feedback
    await pool.query(`
      INSERT INTO call_feedback (call_id, user_id, creator_id, rating, like_text, comments)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [callId || null, userId, creatorId, rating, likeText || '', comments || '']);

    res.status(200).json({ status: 'success', message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
