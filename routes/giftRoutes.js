const express = require('express');
const router = express.Router();

// Temporary static gifts data for testing
const defaultGifts = [
  { id: 'rose', name: 'Rose', price: 10, icon: '🌹', color: '#FF4D4D' },
  { id: 'coffee', name: 'Coffee', price: 25, icon: '☕', color: '#8B4513' },
  { id: 'heart', name: 'Heart', price: 50, icon: '💖', color: '#FF1493' },
  { id: 'diamond', name: 'Diamond', price: 100, icon: '💎', color: '#00DFD8' },
  { id: 'crown', name: 'Crown', price: 500, icon: '👑', color: '#FFD700' }
];

// GET /api/gifts
router.get('/', async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: defaultGifts
    });
  } catch (err) {
    console.error('Error fetching gifts:', err);
    res.status(500).json({ error: 'Failed to fetch gifts' });
  }
});

module.exports = router;
