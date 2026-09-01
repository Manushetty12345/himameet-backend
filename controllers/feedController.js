const pool = require('../db');

/**
 * 4.1 Get Home Feed (Creator List)
 */
exports.getCreators = async (req, res) => {
  try {
    const filter = req.query.filter;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const queryParams = [];
    let paramIndex = 1;
    let whereClauses = [`u.user_role = 'creator'`];

    let query = `
      SELECT 
        u.id AS creator_id,
        u.full_name AS name,
        a.avatar_url,
        u.is_online,
        u.is_new_creator AS is_new,
        COALESCE(cs.voice_rate_per_min, 8.00) AS voice_rate,
        COALESCE(cs.video_rate_per_min, 15.00) AS video_rate,
        cs.is_available
      FROM users u
      LEFT JOIN avatars a ON u.avatar_id = a.id
      LEFT JOIN creator_settings cs ON u.id = cs.user_id
    `;

    if (filter) {
      query += `
        INNER JOIN user_tags ut ON u.id = ut.user_id
        INNER JOIN tags t ON ut.tag_id = t.id
      `;
      whereClauses.push(`t.name = $${paramIndex++}`);
      queryParams.push(filter);
    }

    query += ` WHERE ` + whereClauses.join(' AND ');
    query += ` GROUP BY u.id, a.avatar_url, cs.voice_rate_per_min, cs.video_rate_per_min, cs.is_available ORDER BY u.is_online DESC, u.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const [rows] = await pool.query(query, queryParams);

    const formattedData = rows.map(row => ({
      creator_id: row.creator_id,
      name: row.name,
      avatar_url: row.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-female.png',
      is_online: row.is_online === true,
      is_new: row.is_new === true,
      voice: {
        rate_per_min: parseFloat(row.voice_rate),
        status: row.is_available === true && row.is_online === true ? 'available' : 'offline'
      },
      video: {
        rate_per_min: parseFloat(row.video_rate),
        status: row.is_available === true && row.is_online === true ? 'available' : 'offline'
      }
    }));

    res.status(200).json({
      status: 'success',
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching creators:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 4.2 Random Match
 */
exports.randomMatch = async (req, res) => {
  try {
    const { call_type } = req.body;

    // PostgreSQL uses RANDOM() instead of RAND()
    const [rows] = await pool.query(`
      SELECT u.id AS matched_creator_id
      FROM users u
      LEFT JOIN creator_settings cs ON u.id = cs.user_id
      WHERE u.user_role = 'creator' 
        AND u.is_online = true 
        AND (cs.is_available = true OR cs.is_available IS NULL)
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No creators available for a match right now'
      });
    }

    res.status(200).json({
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    console.error('Error finding random match:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
