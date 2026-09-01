const pool = require('../db');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

/**
 * 8.1 Initiate Call
 */
exports.initiateCall = async (req, res) => {
  try {
    const callerId = req.user.id;
    const { receiver_id, call_type } = req.body;

    if (!receiver_id || !call_type) {
      return res.status(400).json({ status: 'error', message: 'receiver_id and call_type required' });
    }

    const [rateRows] = await pool.query(`SELECT voice_rate_per_min, video_rate_per_min FROM creator_settings WHERE user_id = $1`, [receiver_id]);
    if (rateRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Creator pricing not found' });
    }
    const ratePerMin = call_type === 'video' ? rateRows[0].video_rate_per_min : rateRows[0].voice_rate_per_min;

    const [walletRows] = await pool.query(`SELECT coin_balance FROM wallets WHERE user_id = $1`, [callerId]);
    const balance = walletRows.length > 0 ? walletRows[0].coin_balance : 0;
    
    if (balance < ratePerMin) {
      return res.status(400).json({ status: 'error', message: 'Insufficient coins for this call' });
    }

    const channelName = `call_${callerId}_${receiver_id}_${Date.now()}`;
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    let agoraToken = '';
    if (AGORA_APP_ID && AGORA_APP_CERTIFICATE) {
      agoraToken = RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);
    } else {
      agoraToken = 'dummy_token_no_agora_keys';
    }

    const [insertResult] = await pool.query(`
      INSERT INTO call_logs (caller_id, receiver_id, call_type, status, rate_per_min, agora_channel_name, agora_token)
      VALUES ($1, $2, $3, 'ringing', $4, $5, $6) RETURNING id
    `, [callerId, receiver_id, call_type, ratePerMin, channelName, agoraToken]);

    res.status(200).json({
      status: 'success',
      data: {
        call_id: insertResult[0].id,
        agora_channel_name: channelName,
        agora_token: agoraToken,
        rate_per_min: parseFloat(ratePerMin)
      }
    });

  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 8.2 End Call (REST Fallback)
 */
exports.endCall = async (req, res) => {
  try {
    const { call_id, end_reason } = req.body;
    
    await pool.query(`
      UPDATE call_logs 
      SET status = 'completed', end_reason = $1, ended_at = NOW() 
      WHERE id = $2 AND status != 'completed'
    `, [end_reason || 'user_hung_up', call_id]);

    res.status(200).json({
      status: 'success',
      message: 'Call ended successfully.'
    });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 9.1 Get Call History
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(`
      SELECT 
        c.id AS call_id,
        u.id AS user_id,
        u.full_name AS name,
        a.avatar_url,
        c.call_type,
        c.status,
        c.duration_seconds,
        c.created_at AS timestamp
      FROM call_logs c
      JOIN users u ON (u.id = c.receiver_id OR u.id = c.caller_id) AND u.id != $1
      LEFT JOIN avatars a ON u.avatar_id = a.id
      WHERE c.caller_id = $2 OR c.receiver_id = $3
      ORDER BY c.created_at DESC
      LIMIT 50
    `, [userId, userId, userId]);

    const formatted = rows.map(row => ({
      call_id: row.call_id,
      user: {
        id: row.user_id,
        name: row.name,
        avatar_url: row.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-female.png'
      },
      call_type: row.call_type,
      status: row.status,
      duration_seconds: row.duration_seconds,
      timestamp: row.timestamp
    }));

    res.status(200).json({
      status: 'success',
      data: formatted
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.3 Accept Incoming Call Request
 */
exports.acceptCall = async (req, res) => {
  try {
    const { call_id } = req.params;
    const [rows] = await pool.query('SELECT agora_channel_name, agora_token FROM call_logs WHERE id = $1', [call_id]);
    if (rows.length === 0) return res.status(404).json({status: 'error', message: 'Call not found'});
    
    res.status(200).json({
      status: 'success',
      message: 'Call accepted',
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 11.4 Reject Incoming Call Request
 */
exports.rejectCall = async (req, res) => {
  try {
    const { call_id } = req.params;
    const { reason } = req.body;
    await pool.query('UPDATE call_logs SET status = \'rejected\', end_reason = $1 WHERE id = $2', [reason || 'rejected', call_id]);
    res.status(200).json({ status: 'success', message: 'Call rejected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
