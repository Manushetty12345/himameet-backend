const jwt = require('jsonwebtoken');
const pool = require('./db');

process.env.JWT_SECRET = "super_secret_hima_key_2026"; // Mock secret

async function testMiddleware() {
  try {
    const adminToken = jwt.sign({ id: 1, is_admin: true }, process.env.JWT_SECRET);
    
    let req = {
      headers: { authorization: `Bearer ${adminToken}` }
    };
    
    let res = {
      status: (code) => {
        console.log("Status:", code);
        return { json: (data) => console.log("JSON:", data) };
      }
    };
    
    let next = () => console.log("Next called!");
    
    // Extracted authMiddleware logic
    let token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded:", decoded);
    
    console.log("Querying db...");
    const [userRows] = await pool.query(`SELECT account_status FROM users WHERE id = $1`, [decoded.id]);
    console.log("UserRows:", userRows);
    
  } catch (err) {
    console.error("Caught error:", err.message);
  } finally {
    process.exit(0);
  }
}

testMiddleware();
