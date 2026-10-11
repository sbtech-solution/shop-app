const db = require('../config/db');

const fallbackCategories = [
  { id: 1, name: 'Electronics', slug: 'electronics', image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&auto=format&fit=crop&q=60', is_active: 1 },
  { id: 2, name: 'Fashion', slug: 'fashion', image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&auto=format&fit=crop&q=60', is_active: 1 },
  { id: 3, name: 'Home & Living', slug: 'home-living', image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=60', is_active: 1 },
  { id: 4, name: 'Beauty', slug: 'beauty', image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=60', is_active: 1 }
];

exports.getCategories = async (req, res, next) => {
  try {
    if (!db.getIsConnected()) {
      return res.json({ success: true, categories: fallbackCategories, source: 'fallback' });
    }

    const [rows] = await db.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY name ASC');
    res.json({ success: true, categories: rows });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, image_url } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Name and slug are required.' });
    }

    if (!db.getIsConnected()) {
      return res.status(503).json({ success: false, message: 'Database is not yet connected.' });
    }

    const [result] = await db.query(
      'INSERT INTO categories (name, slug, image_url) VALUES (?, ?, ?)',
      [name, slug.toLowerCase().replace(/\s+/g, '-'), image_url || null]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: { id: result.insertId, name, slug, image_url }
    });
  } catch (err) {
    next(err);
  }
};
