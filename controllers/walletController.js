const pool = require('../db');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || 'test-salt-key';
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'M123456789';

/**
 * 5.1 Get Coin Packages
 */
exports.getPackages = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT id, coins, price AS price_inr, discount_percent AS discount_percentage, is_welcome_offer FROM coin_packages WHERE is_active = true`);
    
    res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 5.2 Initiate Recharge (PhonePe)
 */
exports.initiateRecharge = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { package_id } = req.body;

    if (!package_id) {
      return res.status(400).json({ status: 'error', message: 'package_id is required' });
    }

    const [pkgRows] = await connection.query(`SELECT price, coins FROM coin_packages WHERE id = $1`, [package_id]);
    if (pkgRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Package not found' });
    }
    const pkg = pkgRows[0];
    const amountInPaise = Math.round(pkg.price * 100);

    const merchantTransactionId = 'TXN_' + uuidv4().replace(/-/g, '').substring(0, 15).toUpperCase();

    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: 'U' + userId,
      amount: amountInPaise,
      redirectUrl: 'himaapp://payment/success',
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api/wallet/recharge/webhook`,
      paymentInstrument: { type: 'PAY_PAGE' }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const stringToHash = base64Payload + '/pg/v1/pay' + PHONEPE_SALT_KEY;
    const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = sha256Hash + '###' + PHONEPE_SALT_INDEX;

    await connection.query(
      `INSERT INTO recharge_orders (id, user_id, package_id, amount, coins, status) VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
      [merchantTransactionId, userId, package_id, pkg.price, pkg.coins]
    );

    res.status(200).json({
      status: 'success',
      data: {
        merchant_id: PHONEPE_MERCHANT_ID,
        merchant_transaction_id: merchantTransactionId,
        base64_payload: base64Payload,
        checksum: checksum
      }
    });

  } catch (error) {
    console.error('Error initiating recharge:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  } finally {
    connection.release();
  }
};

/**
 * 5.3 PhonePe Webhook (Server-to-Server)
 */
exports.phonepeWebhook = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).send('Invalid request');
    }

    const decodedStr = Buffer.from(response, 'base64').toString('utf8');
    const responseData = JSON.parse(decodedStr);

    const merchantTransactionId = responseData.data.merchantTransactionId;
    const paymentStatus = responseData.code;
    const phonepeTxnId = responseData.data.transactionId;

    await connection.beginTransaction();

    // PostgreSQL uses SELECT ... FOR UPDATE
    const [orders] = await connection.query(`SELECT * FROM recharge_orders WHERE id = $1 FOR UPDATE`, [merchantTransactionId]);
    
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).send('Order not found');
    }
    const order = orders[0];

    if (order.status !== 'PENDING') {
      await connection.rollback();
      return res.status(200).send('Already processed');
    }

    if (paymentStatus === 'PAYMENT_SUCCESS') {
      await connection.query(`UPDATE recharge_orders SET status = 'SUCCESS' WHERE id = $1`, [merchantTransactionId]);

      await connection.query(
        `INSERT INTO coin_transactions (user_id, type, coins, amount_paid, payment_id) VALUES ($1, 'purchase', $2, $3, $4)`,
        [order.user_id, order.coins, order.amount, phonepeTxnId]
      );

      // PostgreSQL uses ON CONFLICT instead of ON DUPLICATE KEY UPDATE
      await connection.query(
        `INSERT INTO wallets (user_id, coin_balance) VALUES ($1, $2) 
         ON CONFLICT (user_id) DO UPDATE SET coin_balance = wallets.coin_balance + $3`,
        [order.user_id, order.coins, order.coins]
      );
    } else {
      await connection.query(`UPDATE recharge_orders SET status = 'FAILED' WHERE id = $1`, [merchantTransactionId]);
    }

    await connection.commit();
    res.status(200).send('OK');
  } catch (error) {
    await connection.rollback();
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    connection.release();
  }
};

/**
 * 5.4 Check Payment Status
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { transaction_id } = req.params;

    const [rows] = await pool.query(`SELECT status, coins FROM recharge_orders WHERE id = $1 AND user_id = $2`, [transaction_id, req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        transaction_id: transaction_id,
        payment_status: rows[0].status,
        coins_added: rows[0].status === 'SUCCESS' ? rows[0].coins : 0
      }
    });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

/**
 * 5.5 PhonePe Redirect (Callback)
 */
exports.phonepeRedirect = async (req, res) => {
  try {
    const transactionId = req.body.transactionId || req.query.transactionId;
    const status = req.body.code || req.query.code;

    if (status === 'PAYMENT_SUCCESS') {
      res.redirect('himaapp://payment/success?txn=' + transactionId);
    } else {
      res.redirect('himaapp://payment/failure?txn=' + transactionId);
    }
  } catch (error) {
    console.error('Redirect error:', error);
    res.redirect('himaapp://payment/failure');
  }
};
