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
      await db.checkConnection().catch(() => null);
    }

    if (!db.getIsConnected()) {
      return res.json({ success: true, categories: fallbackCategories, source: 'fallback' });
    }

    const [rows] = await db.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY id ASC');
    res.json({ success: true, categories: rows });
  } catch (err) {
    next(err);
  }
};

exports.getAdminCategories = async (req, res, next) => {
  try {
    if (!db.getIsConnected()) {
      await db.checkConnection().catch(() => null);
    }

    if (!db.getIsConnected()) {
      return res.json({ success: true, categories: fallbackCategories, source: 'fallback' });
    }

    const [rows] = await db.query('SELECT * FROM categories ORDER BY id ASC');
    res.json({ success: true, categories: rows });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, image_url } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const categorySlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (!db.getIsConnected()) {
      await db.checkConnection().catch(() => null);
    }

    if (!db.getIsConnected()) {
      const newMockCat = { id: Date.now(), name, slug: categorySlug, image_url: image_url || null, is_active: 1 };
      fallbackCategories.push(newMockCat);
      return res.status(201).json({ success: true, category: newMockCat });
    }

    const [result] = await db.query(
      'INSERT INTO categories (name, slug, image_url) VALUES (?, ?, ?)',
      [name, categorySlug, image_url || null]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: { id: result.insertId, name, slug: categorySlug, image_url: image_url || null, is_active: 1 }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, image_url, is_active } = req.body;
    const categoryId = parseInt(id, 10);

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const categorySlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const active = is_active === undefined ? 1 : (is_active ? 1 : 0);

    if (!db.getIsConnected()) {
      await db.checkConnection().catch(() => null);
    }

    if (!db.getIsConnected()) {
      const category = fallbackCategories.find((item) => item.id === categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }
      Object.assign(category, { name: name.trim(), slug: categorySlug, image_url: image_url || null, is_active: active });
      return res.json({ success: true, category });
    }

    const [result] = await db.query(
      'UPDATE categories SET name = ?, slug = ?, image_url = ?, is_active = ? WHERE id = ?',
      [name.trim(), categorySlug, image_url || null, active, categoryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.json({
      success: true,
      category: { id: categoryId, name: name.trim(), slug: categorySlug, image_url: image_url || null, is_active: active }
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!db.getIsConnected()) {
      await db.checkConnection().catch(() => null);
    }

    if (!db.getIsConnected()) {
      const idx = fallbackCategories.findIndex(c => c.id === parseInt(id, 10));
      if (idx !== -1) fallbackCategories.splice(idx, 1);
      return res.json({ success: true, message: `Category #${id} deleted (mock mode).` });
    }

    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true, message: `Category #${id} deleted successfully.` });
  } catch (err) {
    next(err);
  }
};
