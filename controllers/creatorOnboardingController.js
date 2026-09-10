const pool = require('../db');

/**
 * 3.1 Get Interests/Topics
 */
exports.getInterests = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT id, name FROM tags WHERE tag_type = 'interest' AND is_active = true`);
    
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
    // PostgreSQL uses RANDOM() instead of RAND()
    const [rows] = await pool.query(`SELECT id AS sentence_id, language_code, text FROM voice_sentences ORDER BY RANDOM() LIMIT 1`);
    
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
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { age, bio, sentence_id } = req.body;
    let interest_names = req.body.interest_names;

    if (typeof interest_names === 'string') {
      try {
        interest_names = JSON.parse(interest_names);
      } catch (e) {
        interest_names = interest_names.split(',').map(name => name.trim());
      }
    }

    // Temporarily made optional as per user request
    const voiceRecordingUrl = req.file ? '/uploads/voice_kyc/' + req.file.filename : null;

    await connection.beginTransaction();

    await connection.query(
      `UPDATE users SET age = $1, about_me = $2, user_role = 'creator' WHERE id = $3`,
      [age || null, bio || null, userId]
    );

    if (Array.isArray(interest_names) && interest_names.length > 0) {
      await connection.query(`DELETE FROM user_tags WHERE user_id = $1`, [userId]);
      
      // Look up tag IDs by name (and create them if they don't exist? For now just look them up, or insert them)
      for (const name of interest_names) {
        if (!name) continue;
        let tagId;
        const [existingTag] = await connection.query(`SELECT id FROM tags WHERE name = $1`, [name]);
        if (existingTag.length > 0) {
          tagId = existingTag[0].id;
        } else {
          const [newTag] = await connection.query(`INSERT INTO tags (name, tag_type) VALUES ($1, 'interest') RETURNING id`, [name]);
          tagId = newTag[0].id;
        }
        await connection.query(`INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, tagId]);
      }
    }

    await connection.query(
      `INSERT INTO creator_applications (user_id, status, sentence_id, voice_recording_url) 
       VALUES ($1, 'pending_review', $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET status = 'pending_review', sentence_id = $4, voice_recording_url = $5`,
      [userId, sentence_id || null, voiceRecordingUrl, sentence_id || null, voiceRecordingUrl]
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
