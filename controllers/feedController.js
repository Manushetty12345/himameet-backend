const pool = require('../db');

/**
 * 4.1 Get Home Feed (Creator List)
 * - Filters by the calling user's language (must match)
 * - Optionally filters by interest tag name via ?filter=<tag_name>
 */
exports.getCreators = async (req, res) => {
  try {
    const userId = req.user.id;
    const filter = req.query.filter ? req.query.filter.toLowerCase() : undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const queryParams = [userId];
    let paramIndex = 2;

    // Base WHERE: only show creators
    // Language filter is soft: if male user or creator has no language set, still show them
    let whereClauses = [
      `u.user_role = 'creator'`,
      `(
        u.language_id = (SELECT language_id FROM users WHERE id = $1)
        OR (SELECT language_id FROM users WHERE id = $1) IS NULL
        OR u.language_id IS NULL
      )`
    ];

    let joinClauses = `
      LEFT JOIN avatars a ON u.avatar_id = a.id
      LEFT JOIN creator_settings cs ON u.id = cs.user_id
    `;

    // Optional interest filter
    if (filter && filter !== 'all' && filter !== 'new') {
      joinClauses += `
        INNER JOIN user_tags ut ON u.id = ut.user_id
        INNER JOIN tags t ON ut.tag_id = t.id
      `;
      whereClauses.push(`t.name ILIKE $${paramIndex++}`);
      queryParams.push(filter);
    }

    // 'new' filter - creators registered in the last 7 days
    if (filter === 'new') {
      whereClauses.push(`u.created_at >= NOW() - INTERVAL '7 days'`);
    }

    const query = `
      SELECT
        u.id AS creator_id,
        u.full_name AS name,
        a.avatar_url,
        u.is_online,
        (u.created_at >= NOW() - INTERVAL '7 days') AS is_new,
        cs.voice_rate_per_min AS voice_rate,
        cs.video_rate_per_min AS video_rate,
        COALESCE(cs.is_voice_online, false) AS is_voice_online,
        COALESCE(cs.is_video_online, false) AS is_video_online
      FROM users u
      ${joinClauses}
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY u.id, a.avatar_url, cs.voice_rate_per_min, cs.video_rate_per_min, cs.is_voice_online, cs.is_video_online
      ORDER BY cs.is_voice_online DESC, cs.is_video_online DESC, u.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    queryParams.push(limit, offset);

    const [rows] = await pool.query(query, queryParams);

    console.log(`[getCreators] user=${userId} filter=${filter} rows=${rows.length}`);
    rows.forEach(r => console.log(`  creator=${r.creator_id} voice=${r.is_voice_online} video=${r.is_video_online}`));

    const formattedData = rows.map(row => ({
      creator_id: row.creator_id,
      name: row.name,
      avatar_url: row.avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-female.png',
      is_online: row.is_voice_online === true || row.is_video_online === true,
      is_new: row.is_new === true,
      voice: {
        rate_per_min: row.voice_rate ? parseFloat(row.voice_rate) : 10,
        status: row.is_voice_online === true ? 'available' : 'offline'
      },
      video: {
        rate_per_min: row.video_rate ? parseFloat(row.video_rate) : 20,
        status: row.is_video_online === true ? 'available' : 'offline'
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
exports.randomMatch = async (req, res) => {
  try {
    const { call_type } = req.body;

    const [rows] = await pool.query(`
      SELECT 
        u.id AS matched_creator_id,
        u.full_name AS name,
        a.avatar_url
      FROM users u
      LEFT JOIN creator_settings cs ON u.id = cs.user_id
      LEFT JOIN avatars a ON u.avatar_id = a.id
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
      data: {
        matched_creator_id: rows[0].matched_creator_id,
        name: rows[0].name,
        avatarUri: rows[0].avatar_url || 'https://hima-bucket.s3.amazonaws.com/default-female.png'
      }
    });
  } catch (error) {
    console.error('Error finding random match:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
