const db = require('../config/db');

exports.getDashboardStats = async (req, res, next) => {
  try {
    if (!db.getIsConnected()) {
      return res.json({
        success: true,
        stats: {
          totalProducts: 7,
          totalOrders: 0,
          totalUsers: 0,
          totalSales: 0,
        },
        recentOrders: [],
        source: 'mock'
      });
    }

    const [[{ totalProducts }]] = await db.query('SELECT COUNT(*) AS totalProducts FROM products WHERE is_active = TRUE');
    const [[{ totalOrders }]] = await db.query('SELECT COUNT(*) AS totalOrders FROM orders');
    const [[{ totalUsers }]] = await db.query("SELECT COUNT(*) AS totalUsers FROM users WHERE role = 'customer'");
    const [[{ totalSales }]] = await db.query("SELECT COALESCE(SUM(total_amount), 0) AS totalSales FROM orders WHERE payment_status = 'paid'");

    const [recentOrders] = await db.query(
      `SELECT o.id, o.total_amount, o.status, o.payment_status, o.created_at, u.name as customer_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 5`
    );

    res.json({
      success: true,
      stats: {
        totalProducts: parseInt(totalProducts, 10),
        totalOrders: parseInt(totalOrders, 10),
        totalUsers: parseInt(totalUsers, 10),
        totalSales: parseFloat(totalSales),
      },
      recentOrders
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;

    if (!db.getIsConnected()) {
      return res.json({
        success: true,
        orders: []
      });
    }

    let query = `
      SELECT o.*, u.name AS customer_name, u.email AS customer_email,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
    `;
    const params = [];

    if (status) {
      query += ` WHERE o.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10), offset);

    const [orders] = await db.query(query, params);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    if (!status && !payment_status) {
      return res.status(400).json({ success: false, message: 'status or payment_status is required.' });
    }

    if (!db.getIsConnected()) {
      return res.json({ success: true, message: `Order #${id} updated (mock mode).` });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (payment_status) {
      updates.push('payment_status = ?');
      params.push(payment_status);
    }

    params.push(id);
    await db.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: `Order #${id} updated successfully.` });
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    if (!db.getIsConnected()) {
      return res.json({
        success: true,
        users: []
      });
    }

    const [users] = await db.query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC');
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};
