const pool = require('../db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const bhashsms = require('../utils/bhashsms');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * 1.1 Send OTP
 */
exports.sendOtp = async (req, res) => {
  try {
    let { country_code, mobile_number } = req.body;

    if (!mobile_number || !country_code) {
      return res.status(400).json({ status: 'error', message: 'Missing country code or mobile number' });
    }

    const cleanCountryCode = country_code.replace('+', '');
    const response = await bhashsms.sendOTP(mobile_number, cleanCountryCode);

    if (response.type === 'success') {
      return res.status(200).json({
        status: 'success',
        message: 'OTP sent successfully',
        data: { retry_timeout_seconds: 60 }
      });
    } else {
      return res.status(400).json({ status: 'error', message: response.message || 'Failed to send OTP' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 1.2 Verify OTP
 */
exports.verifyOtp = async (req, res) => {
  try {
    let { country_code, mobile_number, otp } = req.body;

    if (!mobile_number || !country_code || !otp) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const cleanCountryCode = country_code.replace('+', '');

    // Verify OTP via bhashsms in-memory store
    const result = bhashsms.verifyOTP(mobile_number, cleanCountryCode, otp);
    if (result.type !== 'success') {
      return res.status(400).json({ status: 'error', message: result.message || 'Invalid OTP' });
    }

    // Check if user exists in DB
    const [rows] = await pool.query(`SELECT * FROM users WHERE phone_number = $1`, [mobile_number]);

    if (rows.length > 0) {
      // Existing User
      const user = rows[0];
      const token = jwt.sign({ id: user.id, role: user.user_role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          is_new_user: false,
          token,
          user: {
            id: user.id,
            role: user.user_role,
            name: user.full_name,
            phone_number: user.phone_number
          }
        }
      });
    } else {
      // New User
      const payload = {
        temp_phone: mobile_number,
        temp_country_code: country_code
      };

      const tempToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      return res.status(200).json({
        status: 'success',
        message: 'OTP verified, please complete profile',
        data: {
          is_new_user: true,
          temp_token: tempToken
        }
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 1.3 Truecaller Login
 */
exports.truecallerLogin = async (req, res) => {
  try {
    const { payload, signature, signature_algorithm } = req.body;

    if (!payload || !signature) {
      return res.status(400).json({ status: 'error', message: 'Missing Truecaller payload or signature' });
    }

    const decodedPayload = Buffer.from(payload, 'base64').toString('utf8');
    const parsedPayload = JSON.parse(decodedPayload);
    
    let mobile_number = parsedPayload.phoneNumber;
    
    if (!mobile_number) {
      return res.status(400).json({ status: 'error', message: 'Invalid Truecaller payload' });
    }

    let country_code = '+91';
    if (mobile_number.startsWith('+91')) {
      mobile_number = mobile_number.replace('+91', '');
    }

    const [rows] = await pool.query(`SELECT * FROM users WHERE phone_number = $1`, [mobile_number]);

    if (rows.length > 0) {
      const user = rows[0];
      const token = jwt.sign({ id: user.id, role: user.user_role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return res.status(200).json({
        status: 'success',
        message: 'Truecaller Login successful',
        data: {
          is_new_user: false,
          token,
          user: {
            id: user.id,
            role: user.user_role,
            name: user.full_name,
            phone_number: user.phone_number
          }
        }
      });
    } else {
      const tempToken = jwt.sign({ temp_phone: mobile_number, temp_country_code: country_code }, JWT_SECRET, { expiresIn: '1h' });

      return res.status(200).json({
        status: 'success',
        message: 'Truecaller verified, please complete profile',
        data: {
          is_new_user: true,
          temp_token: tempToken
        }
      });
    }
  } catch (error) {
    console.error('Truecaller Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error during Truecaller login' });
  }
};

/**
 * 1.4 Logout
 */
exports.logout = async (req, res) => {
  try {
    const userId = req.body.user_id; 
    const deviceId = req.body.device_id;

    if (userId && deviceId) {
      await pool.query(`DELETE FROM notification_tokens WHERE user_id = $1 AND device_id = $2`, [userId, deviceId]);
      await pool.query(`DELETE FROM user_sessions WHERE user_id = $1 AND device_id = $2`, [userId, deviceId]);
    } else if (userId) {
       await pool.query(`DELETE FROM notification_tokens WHERE user_id = $1`, [userId]);
       await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [userId]);
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully, push tokens cleared'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process logout completely' });
  }
};

/**
 * 1.5 Check Session
 */
exports.checkSession = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // If it has temp_phone, it's a temp token
      if (decoded.temp_phone) {
        return res.status(200).json({
          status: 'success',
          data: {
            is_new_user: true
          }
        });
      }
      
      // If it has id, it's a full token
      if (decoded.id) {
        const [rows] = await pool.query(
          `SELECT id, user_role, full_name, phone_number FROM users WHERE id = $1`,
          [decoded.id]
        );
        
        if (rows.length === 0) {
          return res.status(401).json({ status: 'error', message: 'User not found' });
        }
        
        const user = rows[0];
        return res.status(200).json({
          status: 'success',
          data: {
            is_new_user: false,
            profile_setup_complete: user.profile_setup_complete ?? true,
            user: {
              id: user.id,
              role: user.user_role,
              name: user.full_name,
              phone_number: user.phone_number
            }
          }
        });
      }
      
      return res.status(401).json({ status: 'error', message: 'Invalid token payload' });
      
    } catch (err) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Check Session Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
