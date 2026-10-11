const db = require('../config/db');

// In-memory demo cart fallback for development
const mockCarts = new Map();

async function getOrCreateCartId(userId) {
  const [carts] = await db.query('SELECT id FROM carts WHERE user_id = ?', [userId]);
  if (carts.length > 0) return carts[0].id;
  const [result] = await db.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
  return result.insertId;
}

exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (!db.getIsConnected()) {
      const items = mockCarts.get(userId) || [];
      const total = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
      return res.json({ success: true, items, total, count: items.length });
    }

    const cartId = await getOrCreateCartId(userId);
    const [items] = await db.query(
      `SELECT ci.id, ci.product_id, ci.quantity,
              p.name, p.price, p.stock_quantity,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    const total = items.reduce((acc, it) => acc + (parseFloat(it.price) * it.quantity), 0);
    res.json({ success: true, cart_id: cartId, items, total, count: items.length });
  } catch (err) {
    next(err);
  }
};

exports.addItem = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'product_id is required.' });
    }

    if (!db.getIsConnected()) {
      const items = mockCarts.get(userId) || [];
      const existing = items.find(i => i.product_id === product_id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          id: Date.now(),
          product_id,
          name: req.body.name || 'Sample Product',
          price: parseFloat(req.body.price || 1299),
          image_url: req.body.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
          quantity
        });
      }
      mockCarts.set(userId, items);
      return res.json({ success: true, message: 'Item added to cart (mock mode).', items });
    }

    const cartId = await getOrCreateCartId(userId);

    // Check existing
    const [existing] = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, product_id]
    );

    if (existing.length > 0) {
      const newQty = existing[0].quantity + parseInt(quantity, 10);
      await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing[0].id]);
    } else {
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
        [cartId, product_id, quantity]
      );
    }

    res.json({ success: true, message: 'Item added to cart.' });
  } catch (err) {
    next(err);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!db.getIsConnected()) {
      const items = mockCarts.get(userId) || [];
      const item = items.find(i => i.id == id || i.product_id == id);
      if (item) {
        if (quantity <= 0) {
          const filtered = items.filter(i => i !== item);
          mockCarts.set(userId, filtered);
        } else {
          item.quantity = quantity;
        }
      }
      return res.json({ success: true, message: 'Cart updated (mock mode).' });
    }

    if (quantity <= 0) {
      await db.query('DELETE FROM cart_items WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Item removed from cart.' });
    }

    await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, id]);
    res.json({ success: true, message: 'Quantity updated.' });
  } catch (err) {
    next(err);
  }
};

exports.removeItem = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!db.getIsConnected()) {
      const items = (mockCarts.get(userId) || []).filter(i => i.id != id && i.product_id != id);
      mockCarts.set(userId, items);
      return res.json({ success: true, message: 'Item removed (mock mode).' });
    }

    await db.query('DELETE FROM cart_items WHERE id = ?', [id]);
    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (err) {
    next(err);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (!db.getIsConnected()) {
      mockCarts.delete(userId);
      return res.json({ success: true, message: 'Cart cleared.' });
    }

    const cartId = await getOrCreateCartId(userId);
    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) {
    next(err);
  }
};
