const pool = require('../db');

/**
 * 10.7 Create Support Ticket
 */
exports.createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, description } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ status: 'error', message: 'subject and description are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO support_tickets (user_id, subject, description, status) VALUES ($1, $2, $3, 'active') RETURNING id`, 
      [userId, subject, description]
    );

    res.status(200).json({
      status: 'success',
      message: 'Support ticket created successfully',
      data: { ticket_id: result[0].id }
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 10.7 Get Support Tickets
 */
exports.getTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const statusFilter = req.query.status;

    let query = `SELECT id AS ticket_id, subject, status, created_at FROM support_tickets WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    if (statusFilter) {
      query += ` AND status = $${paramIndex++}`;
      params.push(statusFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.query(query, params);

    res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 10.9 Fetch Static CMS Pages
 */
exports.getStaticPage = (req, res) => {
  const pageKey = req.params.page_key;

  const pages = {
    'terms': { title: 'Terms & Conditions', content_html: '<p>Welcome to Hima. By using this app, you agree to our terms.</p>' },
    'privacy': { title: 'Privacy Policy', content_html: '<p>We respect your privacy and protect your data.</p>' },
    'about': { title: 'About Us', content_html: '<p>Hima is the best platform to connect with creators.</p>' }
  };

  const page = pages[pageKey];

  if (!page) {
    return res.status(404).json({ status: 'error', message: 'Page not found' });
  }

  res.status(200).json({
    status: 'success',
    data: page
  });
};
