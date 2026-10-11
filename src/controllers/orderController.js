const db = require('../config/db');

// In-memory demo orders fallback
const mockOrders = [];

exports.createOrder = async (req, res, next) => {
  const userId = req.user.userId;
  const { address, items, payment_method = 'razorpay' } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
  }

  if (!db.getIsConnected()) {
    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price || item.unit_price) * item.quantity), 0);
    const mockOrder = {
      id: Date.now(),
      user_id: userId,
      user_name: req.user.name,
      total_amount: totalAmount.toFixed(2),
      status: 'processing',
      payment_status: payment_method === 'cod' ? 'unpaid' : 'paid',
      created_at: new Date().toISOString(),
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.name || item.product_name,
        unit_price: item.price || item.unit_price,
        quantity: item.quantity,
      })),
      address: address || { address_line: '123 Market St', city: 'Bengaluru', state: 'Karnataka', postal_code: '560001' }
    };
    mockOrders.unshift(mockOrder);
    return res.status(201).json({
      success: true,
      message: 'Order created successfully (mock mode).',
      order: mockOrder
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Resolve Address
    let addressId = null;
    if (address) {
      const [addrResult] = await connection.query(
        `INSERT INTO addresses (user_id, recipient_name, phone, address_line, city, state, postal_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          address.recipient_name || req.user.name,
          address.phone || '0000000000',
          address.address_line,
          address.city,
          address.state,
          address.postal_code
        ]
      );
      addressId = addrResult.insertId;
    }

    // 2. Validate product stock and calculate actual server-side total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const [prodRows] = await connection.query(
        'SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      if (prodRows.length === 0 || !prodRows[0].is_active) {
        throw new Error(`Product with ID ${item.product_id} is no longer available.`);
      }

      const product = prodRows[0];
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}`);
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: item.quantity
      });

      // Deduct stock
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, product.id]
      );
    }

    // 3. Create Order
    const paymentStatus = payment_method === 'cod' ? 'unpaid' : 'paid';
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, address_id, total_amount, status, payment_status)
       VALUES (?, ?, ?, 'processing', ?)`,
      [userId, addressId, totalAmount, paymentStatus]
    );
    const orderId = orderResult.insertId;

    // 4. Create Order Items (snapshot price)
    for (const item of validatedItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_name, item.unit_price, item.quantity]
      );
    }

    // 5. Record initial payment record
    await connection.query(
      `INSERT INTO payments (order_id, provider, amount, status)
       VALUES (?, ?, ?, ?)`,
      [orderId, payment_method, totalAmount, paymentStatus === 'paid' ? 'successful' : 'pending']
    );

    // 6. Clear user cart
    const [cartRows] = await connection.query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (cartRows.length > 0) {
      await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cartRows[0].id]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: {
        id: orderId,
        total_amount: totalAmount,
        status: 'processing',
        payment_status: paymentStatus,
        items: validatedItems
      }
    });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (!db.getIsConnected()) {
      const userOrders = mockOrders.filter(o => o.user_id === userId);
      return res.json({ success: true, orders: userOrders });
    }

    const [orders] = await db.query(
      `SELECT o.*, a.recipient_name, a.address_line, a.city, a.state, a.postal_code
       FROM orders o
       LEFT JOIN addresses a ON o.address_id = a.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.*,
          (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image_url
         FROM order_items oi
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!db.getIsConnected()) {
      const order = mockOrders.find(o => o.id == id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
      return res.json({ success: true, order });
    }

    const [orders] = await db.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email,
              a.recipient_name, a.phone as recipient_phone, a.address_line, a.city, a.state, a.postal_code
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN addresses a ON o.address_id = a.id
       WHERE o.id = ? ${isAdmin ? '' : 'AND o.user_id = ?'}`,
      isAdmin ? [id] : [id, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    order.items = items;

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};
