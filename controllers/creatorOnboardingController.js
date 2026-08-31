const pool = require('../db');

/**
 * 3.1 Get Interests/Topics
 */
exports.getInterests = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT id, name FROM tags WHERE tag_type = 'interest' AND is_active = 1`);
    
    res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('Error fetching interests:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 3.2 Get Voice Verification Sentence
 */
exports.getVoiceSentence = async (req, res) => {
  try {
    // In production, we can pick a random sentence by order by RAND() LIMIT 1
    const [rows] = await pool.query(`SELECT id AS sentence_id, language_code, text FROM voice_sentences ORDER BY RAND() LIMIT 1`);
    
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No voice sentences available' });
    }

    res.status(200).json({
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching voice sentence:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 3.3 Submit Creator Application (Voice KYC)
 */
exports.submitApplication = async (req, res) => {
  // Start a transaction because we update users, user_tags, and creator_applications
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { age, bio, sentence_id } = req.body;
    let interest_ids = req.body.interest_ids;

    // Handle array parsing if it comes as a string from form-data (e.g. "[1,3,5]")
    if (typeof interest_ids === 'string') {
      try {
        interest_ids = JSON.parse(interest_ids);
      } catch (e) {
        // If it's not JSON, it might just be a comma separated string
        interest_ids = interest_ids.split(',').map(id => parseInt(id.trim()));
      }
    }

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Voice recording is required' });
    }

    const voiceRecordingUrl = '/uploads/voice_kyc/' + req.file.filename;

    await connection.beginTransaction();

    // 1. Update user profile (age, bio)
    await connection.query(
      `UPDATE users SET age = ?, about_me = ?, user_role = 'creator' WHERE id = ?`,
      [age || null, bio || null, userId]
    );

    // 2. Insert interests into user_tags
    if (Array.isArray(interest_ids) && interest_ids.length > 0) {
      // Clear old interests if any
      await connection.query(`DELETE FROM user_tags WHERE user_id = ?`, [userId]);
      
      const tagValues = interest_ids.map(tagId => [userId, tagId]);
      await connection.query(`INSERT INTO user_tags (user_id, tag_id) VALUES ?`, [tagValues]);
    }

    // 3. Insert into creator_applications
    await connection.query(
      `INSERT INTO creator_applications (user_id, status, sentence_id, voice_recording_url) 
       VALUES (?, 'pending_review', ?, ?)
       ON DUPLICATE KEY UPDATE status = 'pending_review', sentence_id = VALUES(sentence_id), voice_recording_url = VALUES(voice_recording_url)`,
      [userId, sentence_id || null, voiceRecordingUrl]
    );

    await connection.commit();

    res.status(200).json({
      status: 'success',
      message: 'Application submitted. Pending admin approval.',
      data: {
        application_status: 'pending_review'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error submitting application:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
};
