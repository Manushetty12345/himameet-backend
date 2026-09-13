const pool = require('../db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hima_key_2026';
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
    const [rows] = await pool.query(`SELECT id, name_english, name_native, language_code FROM languages WHERE is_active = true ORDER BY display_order ASC`);

    let data = rows;
    if (data.length === 0) {
      data = [{ id: 1, name_english: 'Kannada', name_native: 'ಕನ್ನಡ', language_code: 'kn' }];
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
 * 2.3 Get Interests (Tags)
 */
exports.getInterests = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT id, name FROM tags WHERE tag_type = 'interest' AND is_active = true ORDER BY display_order ASC`);

    let data = rows;
    if (data.length === 0) {
      data = [{ id: 1, name: 'Photography' }];
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
 * 2.4 Save Profile Setup
 */
exports.saveProfileSetup = async (req, res) => {
  try {
    const { temp_phone, temp_country_code } = req.user;
    const { gender, avatar_id, language_id, referral_code_used } = req.body;

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

    // Lookup referrer if a code was provided
    let referrerId = null;
    if (referral_code_used) {
      const [referrerRows] = await pool.query(
        `SELECT id FROM users WHERE referral_code = $1`, [referral_code_used.trim().toUpperCase()]
      );
      if (referrerRows.length > 0) {
        referrerId = referrerRows[0].id;
      }
    }

    // Generate a unique invite code: HM + 4 digits + 4 uppercase letters
    const digits = Math.floor(1000 + Math.random() * 9000).toString();
    const letters = uuidv4().replace(/-/g, '').slice(0, 4).toUpperCase();
    const referral_code = 'HM' + digits + letters;
    const fullName = 'User ' + temp_phone.slice(-4);

    // Ensure referred_by column exists (safe migration)
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referred_by') THEN
          ALTER TABLE users ADD COLUMN referred_by INTEGER REFERENCES users(id);
        END IF;
      END $$;
    `);

    const [result] = await pool.query(
      `INSERT INTO users (phone_number, country_code, full_name, user_role, gender, avatar_id, language_id, referral_code, referred_by, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [temp_phone, temp_country_code || '+91', fullName, 'user', gender, avatar_id, language_id, referral_code, referrerId, true]
    );

    const newUserId = result[0].id;

    // Award coins to referrer
    if (referrerId) {
      await pool.query(
        `UPDATE wallets SET coin_balance = coin_balance + 40 WHERE user_id = $1`,
        [referrerId]
      );
      await pool.query(
        `INSERT INTO coin_transactions (user_id, type, coins, amount_paid, notes) VALUES ($1, 'referral_bonus', 40, 0, $2)`,
        [referrerId, `Referral bonus for inviting user ${newUserId}`]
      );
    }

    const token = jwt.sign({ id: newUserId, role: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        next_step: 'dashboard',
        token,
        user: {
          id: newUserId,
          role: 'user',
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

exports.getVoiceSentence = async (req, res) => {
  try {
    // In the future, this could be fetched from a database table 'settings' for multi-language support.
    res.json({ success: true, data: 'Hello! I am excited to join Himameet and meet new people.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


exports.submitCreatorApplication = async (req, res) => {
  try {
    const { temp_phone, temp_country_code } = req.user;
    const { gender, avatar_id, language_id, age, bio, interests } = req.body;
    
    // The uploaded file will be available in req.file
    let voice_sample_url = null;
    let ai_gender_score = null;

    if (req.file) {
      voice_sample_url = '/uploads/' + req.file.filename;
      
      // AI Verification
      try {
        const fs = require('fs');
        const axios = require('axios');
        const fileData = fs.readFileSync(req.file.path);
        
        console.log('Sending audio to Hugging Face...');
        const response = await axios.post(
          'https://api-inference.huggingface.co/models/alefiury/wav2vec2-large-xlsr-53-gender-recognition',
          fileData,
          {
            headers: {
              'Content-Type': 'audio/mp4',
              // Use API Key if available, otherwise rely on free tier rate-limits
              ...(process.env.HUGGINGFACE_API_KEY ? { 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}` } : {})
            }
          }
        );
        
        console.log('Hugging Face Response:', response.data);
        
        // Find the 'female' score
        if (Array.isArray(response.data)) {
          const femaleObj = response.data.find(r => r.label === 'female');
          if (femaleObj) {
            ai_gender_score = femaleObj.score * 100; // Convert to percentage
          }
        }
      } catch (aiError) {
        console.warn('AI Verification failed or rate-limited. Proceeding anyway.', aiError?.response?.data || aiError.message);
      }
    }

    if (!temp_phone) {
      return res.status(401).json({ status: 'error', message: 'Invalid temporary token.' });
    }

    const [existing] = await pool.query(`SELECT * FROM users WHERE phone_number = $1`, [temp_phone]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'User already completed profile' });
    }

    // Attempt schema migration in case it hasn't run
    try {
      await pool.query('ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS voice_sample_url TEXT');
      await pool.query('ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS ai_gender_score NUMERIC(5,2)');
    } catch(e) {
      console.warn("Migration warning:", e.message);
    }

    const fullName = 'Creator ' + temp_phone.slice(-4);

    // Insert into users
    const [result] = await pool.query(
      `INSERT INTO users (phone_number, country_code, full_name, user_role, gender, avatar_id, language_id, age, about_me, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [temp_phone, temp_country_code || '+91', fullName, 'creator', gender, avatar_id, language_id, age, bio, false]
    );
    const newUserId = result[0].id;

    // Handle interests if provided
    if (interests) {
      try {
        let parsedInterests = JSON.parse(interests);
        for (let tagId of parsedInterests) {
          await pool.query(
            `INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newUserId, tagId]
          );
        }
      } catch (e) {
        console.warn('Could not parse interests', interests);
      }
    }

    // Insert into creator_applications
    await pool.query(
      `INSERT INTO creator_applications (user_id, status, voice_sample_url, ai_gender_score) VALUES ($1, 'pending_review', $2, $3)`,
      [newUserId, voice_sample_url, ai_gender_score]
    );

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: newUserId, role: 'creator' }, process.env.JWT_SECRET || 'super_secret_hima_key_2026', { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

    res.status(200).json({
      status: 'success',
      message: 'Application submitted successfully',
      data: {
        token,
        user: {
          id: newUserId,
          role: 'creator',
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

