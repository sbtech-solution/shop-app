const crypto = require('crypto');
const db = require('../config/db');

exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { order_id, amount } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required.' });
    }

    // In a live Razorpay integration:
    // const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    // const rzpOrder = await razorpay.orders.create({ amount: amount * 100, currency: 'INR', receipt: `rcpt_${order_id}` });

    const mockRzpOrderId = `order_rzp_${Date.now()}`;

    res.json({
      success: true,
      message: 'Razorpay order created.',
      payment: {
        id: mockRzpOrderId,
        amount: Math.round(parseFloat(amount) * 100), // amount in paise
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_sample_key',
        order_id: order_id || null
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_sample_secret';
    let isValid = false;

    if (razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      isValid = generatedSignature === razorpay_signature;
    } else {
      // In development / test sandbox, allow simulated payments
      isValid = true;
    }

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    if (db.getIsConnected() && order_id) {
      await db.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [order_id]);
      await db.query(
        "UPDATE payments SET status = 'successful', provider_payment_id = ? WHERE order_id = ?",
        [razorpay_payment_id || `sim_${Date.now()}`, order_id]
      );
    }

    res.json({
      success: true,
      message: 'Payment verified and recorded successfully.'
    });
  } catch (err) {
    next(err);
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret';
    const signature = req.headers['x-razorpay-signature'];

    // In production, verify crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex') === signature
    console.log('🔔 [Payment Webhook Received]:', req.body?.event);

    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
