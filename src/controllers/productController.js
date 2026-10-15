const db = require('../config/db');

const fallbackProducts = [
  {
    id: 1,
    category_id: 1,
    category_name: 'Electronics',
    name: 'Wireless Noise-Canceling Headphones',
    description: 'Premium sound experience with 40-hour battery life and active noise cancellation.',
    price: '1299.00',
    stock_quantity: 45,
    is_active: 1,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'],
    rating: 4.8,
    reviews_count: 24
  },
  {
    id: 2,
    category_id: 1,
    category_name: 'Electronics',
    name: 'Smart Watch Active 2',
    description: 'Fitness tracking smartwatch with AMOLED display, heart rate sensor, and waterproof body.',
    price: '2499.00',
    stock_quantity: 30,
    is_active: 1,
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
    rating: 4.6,
    reviews_count: 18
  },
  {
    id: 3,
    category_id: 1,
    category_name: 'Electronics',
    name: 'Ultra-Slim 20,000mAh Power Bank',
    description: 'High-speed dual USB-C output power bank with fast charging support.',
    price: '899.00',
    stock_quantity: 80,
    is_active: 1,
    image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80'],
    rating: 4.5,
    reviews_count: 12
  },
  {
    id: 4,
    category_id: 2,
    category_name: 'Fashion',
    name: 'Classic Cotton Casual Shirt',
    description: 'Breathable organic cotton shirt, tailor-fitted for everyday elegance.',
    price: '699.00',
    stock_quantity: 50,
    is_active: 1,
    image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80'],
    rating: 4.7,
    reviews_count: 31
  },
  {
    id: 5,
    category_id: 2,
    category_name: 'Fashion',
    name: 'Urban Lightweight Running Shoes',
    description: 'Ergonomic sole cushioning designed for high agility and long-distance runs.',
    price: '1499.00',
    stock_quantity: 25,
    is_active: 1,
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'],
    rating: 4.9,
    reviews_count: 42
  },
  {
    id: 6,
    category_id: 3,
    category_name: 'Home & Living',
    name: 'Nordic Minimalist Desk Lamp',
    description: 'Adjustable warm-to-cool LED lighting with touch dimmer and metallic base.',
    price: '799.00',
    stock_quantity: 40,
    is_active: 1,
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80'],
    rating: 4.4,
    reviews_count: 9
  },
  {
    id: 7,
    category_id: 4,
    category_name: 'Beauty',
    name: 'Organic Vitamin C Facial Serum',
    description: 'Rejuvenating glow serum infused with natural botanical extracts and hyaluronic acid.',
    price: '499.00',
    stock_quantity: 60,
    is_active: 1,
    image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80'],
    rating: 4.9,
    reviews_count: 55
  }
];

exports.getProducts = async (req, res, next) => {
  try {
    const { category_id, search, limit = 50, page = 1 } = req.query;

    if (!db.getIsConnected()) {
      let filtered = [...fallbackProducts];
      if (category_id) {
        filtered = filtered.filter(p => p.category_id === parseInt(category_id, 10));
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      }
      return res.json({ success: true, products: filtered, total: filtered.length, source: 'fallback' });
    }

    let query = `
      SELECT 
        p.*, 
        c.name AS category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image_url,
        COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id), 4.8) AS rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS reviews_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
    `;
    const params = [];

    if (category_id) {
      query += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY p.display_order ASC, p.id DESC LIMIT ? OFFSET ?`;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10), offset);

    const [rows] = await db.query(query, params);
    res.json({ success: true, products: rows, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!db.getIsConnected()) {
      const product = fallbackProducts.find(p => p.id === parseInt(id, 10));
      if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
      return res.json({ success: true, product, source: 'fallback' });
    }

    const [products] = await db.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = products[0];

    // Fetch images
    const [images] = await db.query(
      'SELECT image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
      [id]
    );
    product.images = images.map(img => img.image_url);
    product.image_url = product.images[0] || null;

    // Fetch reviews
    const [reviews] = await db.query(
      `SELECT r.*, u.name as user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );
    product.reviews = reviews;

    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { category_id, name, description, price, stock_quantity, display_order, images } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Name and price are required.' });
    }

    if (!db.getIsConnected()) {
      const newProd = {
        id: fallbackProducts.length + 1,
        category_id: parseInt(category_id || 1, 10),
        name,
        description: description || '',
        price: parseFloat(price).toFixed(2),
        stock_quantity: parseInt(stock_quantity || 0, 10),
        display_order: parseInt(display_order || 0, 10),
        is_active: 1,
        image_url: (images && images[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        images: images || []
      };
      fallbackProducts.unshift(newProd);
      return res.status(201).json({ success: true, product: newProd, message: 'Product created (mock mode).' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        'INSERT INTO products (category_id, name, description, price, stock_quantity, display_order) VALUES (?, ?, ?, ?, ?, ?)',
        [category_id || null, name, description || '', price, stock_quantity || 0, display_order || 0]
      );

      const productId = result.insertId;

      if (Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await connection.query(
            'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)',
            [productId, images[i], i]
          );
        }
      }

      await connection.commit();
      res.status(201).json({
        success: true,
        message: 'Product created successfully.',
        product: { id: productId, name, price, stock_quantity }
      });
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, category_id, display_order, is_active } = req.body;

    if (!db.getIsConnected()) {
      const idx = fallbackProducts.findIndex(p => p.id === parseInt(id, 10));
      if (idx !== -1) {
        fallbackProducts[idx] = { ...fallbackProducts[idx], ...req.body };
        return res.json({ success: true, message: 'Product updated (mock mode).', product: fallbackProducts[idx] });
      }
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (stock_quantity !== undefined) { updates.push('stock_quantity = ?'); params.push(stock_quantity); }
    if (display_order !== undefined) { updates.push('display_order = ?'); params.push(display_order); }
    if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(id);
    await db.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!db.getIsConnected()) {
      const idx = fallbackProducts.findIndex(p => p.id === parseInt(id, 10));
      if (idx !== -1) fallbackProducts.splice(idx, 1);
      return res.json({ success: true, message: 'Product deleted.' });
    }

    await db.query('UPDATE products SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Product deactivated successfully.' });
  } catch (err) {
    next(err);
  }
};
