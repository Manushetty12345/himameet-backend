const fs = require('fs');
let indexCode = fs.readFileSync('index.js', 'utf8');

const routeCode = "\n// TEMPORARY DELETE ROUTE\n" +
"app.get('/api/delete-temp-user/:phone', async (req, res) => {\n" +
"  const phone = req.params.phone;\n" +
"  try {\n" +
"    const { rows } = await pool.query('SELECT id FROM users WHERE phone_number = ', [phone]);\n" +
"    if (rows.length === 0) {\n" +
"      return res.status(404).json({ error: 'User not found' });\n" +
"    }\n" +
"    const userId = rows[0].id;\n" +
"    \n" +
"    await pool.query('DELETE FROM notification_tokens WHERE user_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM user_sessions WHERE user_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM transactions WHERE user_id =  OR creator_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM wallets WHERE user_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM followers WHERE follower_id =  OR following_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM reports WHERE reporter_id =  OR reported_user_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM blocked_users WHERE blocker_id =  OR blocked_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM call_logs WHERE caller_id =  OR receiver_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM creators WHERE user_id = ', [userId]);\n" +
"    await pool.query('DELETE FROM users WHERE id = ', [userId]);\n" +
"    \n" +
"    res.json({ success: true, message: 'User and all related data deleted successfully' });\n" +
"  } catch (error) {\n" +
"    console.error('Delete error:', error);\n" +
"    res.status(500).json({ error: error.message });\n" +
"  }\n" +
"});\n";

if (!indexCode.includes('/api/delete-temp-user/:phone')) {
  indexCode = indexCode.replace('// Start Server', routeCode + '\n// Start Server');
  fs.writeFileSync('index.js', indexCode, 'utf8');
  console.log('Added temporary delete route');
} else {
  console.log('Route already exists');
}
