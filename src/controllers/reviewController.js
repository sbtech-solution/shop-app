const db = require('../config/db');

exports.getAllReviews = async (req, res, next) => {
  try {
    if (!db.getIsConnected()) {
      await db.checkConnection().catch(() => null);
    }

    if (!db.getIsConnected()) {
      return res.json({
        success: true,
        reviews: [
          {
            id: 1,
            user_name: 'Rahul Sharma',
            product_name: 'Wireless Noise-Canceling Headphones',
            rating: 5,
            comment: 'Amazing sound quality and battery life! Best headphones in this price range.',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            user_name: 'Priya Patel',
            product_name: 'Smart Watch Active 2',
            rating: 4,
            comment: 'Very sleek design and accurate step tracking. Highly recommend!',
            created_at: new Date().toISOString()
          }
        ]
      });
    }

    const [reviews] = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              COALESCE(u.name, 'Customer') AS user_name,
              u.email AS user_email,
              COALESCE(p.name, 'Product') AS product_name,
              (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS product_image
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       ORDER BY r.created_at DESC`
    );

    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!db.getIsConnected()) {
      await db.checkConnection().catch(() => null);
    }

    if (!db.getIsConnected()) {
      return res.json({ success: true, message: `Review #${id} deleted (mock mode).` });
    }

    await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    res.json({ success: true, message: `Review #${id} deleted successfully.` });
  } catch (err) {
    next(err);
  }
};
