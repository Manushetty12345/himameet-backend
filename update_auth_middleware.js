const fs = require('fs');
const file = 'middleware/authMiddleware.js';
let content = fs.readFileSync(file, 'utf8');

// Currently authMiddleware.js only verifies the token.
// We need to add a pool query to check account_status.
const replacement = `const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Added DB pool

const JWT_SECRET = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Strict Ban Check
      const [userRows] = await pool.query(\`SELECT account_status FROM users WHERE id = $1\`, [decoded.id]);
      if (userRows.length === 0) {
        return res.status(401).json({ status: 'error', message: 'User not found' });
      }
      if (userRows[0].account_status === 'banned') {
        return res.status(403).json({ status: 'error', message: 'ACCOUNT_BANNED' });
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ status: 'error', message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };`;

fs.writeFileSync(file, replacement);
console.log("authMiddleware.js updated to strictly enforce bans!");
