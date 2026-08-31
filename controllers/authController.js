const pool = require('../db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const msg91 = require('../utils/msg91');
const crypto = require('crypto');

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
    const response = await msg91.sendOTP(mobile_number, cleanCountryCode);

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

    // 1. Verify with MSG91
    const response = await msg91.verifyOTP(mobile_number, cleanCountryCode, otp);

    if (response.type !== 'success') {
      return res.status(400).json({ status: 'error', message: 'Invalid OTP' });
    }

    // 2. Check if user exists in DB
    const [rows] = await pool.query(`SELECT * FROM users WHERE phone_number = ?`, [mobile_number]);

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

    // Decode the base64 payload to get user details
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf8');
    const parsedPayload = JSON.parse(decodedPayload);
    
    // Note: In production you'd fetch Truecaller's public keys from https://api4.truecaller.com/v1/key 
    // and verify the signature here.
    
    // Extract phone number from Truecaller payload
    let mobile_number = parsedPayload.phoneNumber;
    
    if (!mobile_number) {
      return res.status(400).json({ status: 'error', message: 'Invalid Truecaller payload' });
    }

    // Separate country code (assuming +91 for now as per schema logic)
    let country_code = '+91';
    if (mobile_number.startsWith('+91')) {
      mobile_number = mobile_number.replace('+91', '');
    }

    // DB Logic (Same as Verify OTP)
    const [rows] = await pool.query(`SELECT * FROM users WHERE phone_number = ?`, [mobile_number]);

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
      // New User
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
      await pool.query(`DELETE FROM notification_tokens WHERE user_id = ? AND device_id = ?`, [userId, deviceId]);
      await pool.query(`DELETE FROM user_sessions WHERE user_id = ? AND device_id = ?`, [userId, deviceId]);
    } else if (userId) {
       await pool.query(`DELETE FROM notification_tokens WHERE user_id = ?`, [userId]);
       await pool.query(`DELETE FROM user_sessions WHERE user_id = ?`, [userId]);
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
