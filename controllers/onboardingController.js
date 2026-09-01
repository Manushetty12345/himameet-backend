const pool = require('../db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * 2.1 Get Avatars
 */
exports.getAvatars = async (req, res) => {
  try {
    const gender = req.query.gender || 'male';

    const [rows] = await pool.query(`SELECT id, avatar_url, gender FROM avatars WHERE gender = $1`, [gender]);

    let data = rows;
    if (data.length === 0) {
      data = [{ id: 1, avatar_url: 'https://hima-bucket.s3.amazonaws.com/default-avatar.png', gender }];
    }

    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 2.2 Get Languages
 */
exports.getLanguages = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT id, name_english, language_code FROM languages WHERE is_active = true`);

    let data = rows;
    if (data.length === 0) {
      data = [{ id: 1, name_english: 'Kannada', language_code: 'kn' }];
    }

    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 2.3 Save Profile Setup
 */
exports.saveProfileSetup = async (req, res) => {
  try {
    const { temp_phone, temp_country_code } = req.user;
    const { gender, avatar_id, language_id } = req.body;

    if (!temp_phone) {
      return res.status(401).json({ status: 'error', message: 'Invalid temporary token. Phone number missing.' });
    }

    if (!gender || !avatar_id || !language_id) {
      return res.status(400).json({ status: 'error', message: 'Missing required profile fields' });
    }

    const [avatarRows] = await pool.query(`SELECT avatar_url FROM avatars WHERE id = $1`, [avatar_id]);
    let avatar_url = avatarRows.length > 0 ? avatarRows[0].avatar_url : 'https://hima-bucket.s3.amazonaws.com/default-avatar.png';

    const [existing] = await pool.query(`SELECT * FROM users WHERE phone_number = $1`, [temp_phone]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'User already completed profile' });
    }

    const referral_code = 'HIMA' + uuidv4().split('-')[0].toUpperCase();
    const fullName = 'User ' + temp_phone.slice(-4);

    const [result] = await pool.query(
      `INSERT INTO users (phone_number, country_code, full_name, user_role, gender, avatar_id, language_id, referral_code, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [temp_phone, temp_country_code || '+91', fullName, 'male', gender, avatar_id, language_id, referral_code, true]
    );

    const newUserId = result[0].id;

    const token = jwt.sign({ id: newUserId, role: 'male' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        next_step: 'dashboard',
        token,
        user: {
          id: newUserId,
          role: 'male',
          name: fullName,
          phone_number: temp_phone
        }
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
