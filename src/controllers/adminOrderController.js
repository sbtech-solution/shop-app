const db = require('../config/db');

exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;

    if (!db.getIsConnected()) {
      await db.checkConnection().catch(() => null);
    }

    if (!db.getIsConnected()) {
      return res.json({ success: true, orders: [] });
    }

    let query = `
      SELECT o.id, o.user_id, o.guest_name, o.guest_email, o.address_id,
             o.total_amount, o.status, o.payment_status, o.created_at,
             COALESCE(u.name, o.guest_name, a.recipient_name, 'Guest Customer') AS customer_name,
             COALESCE(u.email, o.guest_email, 'No email') AS customer_email,
             u.phone AS customer_phone,
             a.recipient_name, a.phone AS recipient_phone, a.address_line,
             a.city, a.state, a.postal_code,
             CASE WHEN o.user_id IS NULL THEN 1 ELSE 0 END AS is_guest
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.address_id = a.id
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10), offset);

    const [orders] = await db.query(query, params);

    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.id, oi.product_id, oi.product_name, oi.unit_price, oi.quantity,
                (SELECT image_url FROM product_images
                 WHERE product_id = oi.product_id
                 ORDER BY sort_order ASC, id ASC LIMIT 1) AS image_url
         FROM order_items oi
         WHERE oi.order_id = ?
         ORDER BY oi.id ASC`,
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};
