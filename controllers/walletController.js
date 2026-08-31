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
    const [rows] = await pool.query(`SELECT id, coins, price AS price_inr, discount_percent AS discount_percentage, is_welcome_offer FROM coin_packages WHERE is_active = 1`);
    
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

    // 1. Get package details
    const [pkgRows] = await connection.query(`SELECT price, coins FROM coin_packages WHERE id = ?`, [package_id]);
    if (pkgRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Package not found' });
    }
    const pkg = pkgRows[0];
    const amountInPaise = Math.round(pkg.price * 100);

    // 2. Generate unique Transaction ID
    const merchantTransactionId = 'TXN_' + uuidv4().replace(/-/g, '').substring(0, 15).toUpperCase();

    // 3. Create PhonePe Payload
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: 'U' + userId,
      amount: amountInPaise,
      redirectUrl: 'himaapp://payment/success',
      redirectMode: 'REDIRECT',
      callbackUrl: 'http://localhost:5000/api/wallet/recharge/webhook',
      paymentInstrument: { type: 'PAY_PAGE' }
    };

    // 4. Encode Payload to Base64
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // 5. Generate Checksum (X-VERIFY)
    // Formula: sha256(base64Payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
    const stringToHash = base64Payload + '/pg/v1/pay' + PHONEPE_SALT_KEY;
    const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = sha256Hash + '###' + PHONEPE_SALT_INDEX;

    // 6. Save PENDING order to DB
    await connection.query(
      `INSERT INTO recharge_orders (id, user_id, package_id, amount, coins, status) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
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

    // Decode the response
    const decodedStr = Buffer.from(response, 'base64').toString('utf8');
    const responseData = JSON.parse(decodedStr);

    const merchantTransactionId = responseData.data.merchantTransactionId;
    const paymentStatus = responseData.code; // 'PAYMENT_SUCCESS' or 'PAYMENT_ERROR'
    const phonepeTxnId = responseData.data.transactionId;

    await connection.beginTransaction();

    // Find the pending order
    const [orders] = await connection.query(`SELECT * FROM recharge_orders WHERE id = ? FOR UPDATE`, [merchantTransactionId]);
    
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).send('Order not found');
    }
    const order = orders[0];

    // If already processed, ignore
    if (order.status !== 'PENDING') {
      await connection.rollback();
      return res.status(200).send('Already processed');
    }

    if (paymentStatus === 'PAYMENT_SUCCESS') {
      // 1. Update order status
      await connection.query(`UPDATE recharge_orders SET status = 'SUCCESS' WHERE id = ?`, [merchantTransactionId]);

      // 2. Add to coin_transactions
      await connection.query(
        `INSERT INTO coin_transactions (user_id, type, coins, amount_paid, payment_id) VALUES (?, 'purchase', ?, ?, ?)`,
        [order.user_id, order.coins, order.amount, phonepeTxnId]
      );

      // 3. Update or create wallet balance
      await connection.query(
        `INSERT INTO wallets (user_id, coin_balance) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE coin_balance = coin_balance + ?`,
        [order.user_id, order.coins, order.coins]
      );
    } else {
      // Payment Failed
      await connection.query(`UPDATE recharge_orders SET status = 'FAILED' WHERE id = ?`, [merchantTransactionId]);
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

    const [rows] = await pool.query(`SELECT status, coins FROM recharge_orders WHERE id = ? AND user_id = ?`, [transaction_id, req.user.id]);

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
    // PhonePe redirects back to this URL after the payment gateway.
    // If we're using a mobile app, we just redirect them back into the app using a Deep Link!
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
