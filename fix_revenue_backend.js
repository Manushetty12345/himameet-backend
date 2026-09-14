const fs = require('fs');
const file = 'controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix Overview queries
content = content.replace(
  `const [[todayRevenue]] = await pool.query(\`
      SELECT COALESCE(SUM(coins), 0) as total FROM coin_transactions 
      WHERE type = 'purchase' AND DATE(created_at) = CURRENT_DATE
    \`);`,
  `const [[todayRevenue]] = await pool.query(\`
      SELECT COALESCE(SUM(coins), 0) as total_coins, COALESCE(SUM(amount_paid), 0) as total_inr FROM coin_transactions 
      WHERE type = 'purchase' AND DATE(created_at) = CURRENT_DATE
    \`);`
);

content = content.replace(
  `const [[monthRevenue]] = await pool.query(\`
      SELECT COALESCE(SUM(coins), 0) as total FROM coin_transactions 
      WHERE type = 'purchase' AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    \`);`,
  `const [[monthRevenue]] = await pool.query(\`
      SELECT COALESCE(SUM(coins), 0) as total_coins, COALESCE(SUM(amount_paid), 0) as total_inr FROM coin_transactions 
      WHERE type = 'purchase' AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    \`);`
);

content = content.replace(
  `const [[totalRevenue]] = await pool.query(\`
      SELECT COALESCE(SUM(coins), 0) as total FROM coin_transactions WHERE type = 'purchase'
    \`);`,
  `const [[totalRevenue]] = await pool.query(\`
      SELECT COALESCE(SUM(coins), 0) as total_coins, COALESCE(SUM(amount_paid), 0) as total_inr FROM coin_transactions WHERE type = 'purchase'
    \`);`
);

// 2. Fix Overview mapping
content = content.replace(
  `today_revenue_coins: parseInt(todayRevenue.total),
        today_revenue_inr: parseFloat((todayRevenue.total / 10).toFixed(2)),
        month_revenue_coins: parseInt(monthRevenue.total),
        month_revenue_inr: parseFloat((monthRevenue.total / 10).toFixed(2)),
        total_revenue_coins: parseInt(totalRevenue.total),
        total_revenue_inr: parseFloat((totalRevenue.total / 10).toFixed(2)),`,
  `today_revenue_coins: parseInt(todayRevenue.total_coins),
        today_revenue_inr: parseFloat(todayRevenue.total_inr),
        month_revenue_coins: parseInt(monthRevenue.total_coins),
        month_revenue_inr: parseFloat(monthRevenue.total_inr),
        total_revenue_coins: parseInt(totalRevenue.total_coins),
        total_revenue_inr: parseFloat(totalRevenue.total_inr),`
);

// 3. Fix Chart Query
content = content.replace(
  `SELECT DATE(created_at) as date, COALESCE(SUM(coins), 0) as coins
      FROM coin_transactions
      WHERE type = 'purchase' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)`,
  `SELECT DATE(created_at) as date, COALESCE(SUM(coins), 0) as coins, COALESCE(SUM(amount_paid), 0) as inr
      FROM coin_transactions
      WHERE type = 'purchase' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)`
);

fs.writeFileSync(file, content);
console.log("adminController.js updated successfully!");
