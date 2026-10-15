const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const galleryImages = [
  'https://pandiyanagency.com/wp-content/uploads/2019/11/16.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/15.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/13.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/14.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/11.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/12.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/17.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/19.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/18.jpg',
  'https://pandiyanagency.com/wp-content/uploads/2019/11/20.jpg',
];

async function importProducts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true'
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      : undefined,
  });

  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO categories (name, slug, image_url, is_active)
       VALUES (?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE name = VALUES(name), image_url = VALUES(image_url), is_active = TRUE`,
      [
        'PVC Pipes & Fittings',
        'pvc-pipes-fittings',
        galleryImages[0],
      ]
    );

    const [[category]] = await connection.query(
      'SELECT id FROM categories WHERE slug = ?',
      ['pvc-pipes-fittings']
    );

    for (let index = 0; index < galleryImages.length; index += 1) {
      const productName = `PVC / CPVC / UPVC Product ${String(index + 1).padStart(2, '0')}`;
      const [existing] = await connection.query(
        'SELECT id FROM products WHERE name = ? LIMIT 1',
        [productName]
      );

      let productId;
      if (existing.length > 0) {
        productId = existing[0].id;
        await connection.query(
          `UPDATE products
           SET category_id = ?, description = ?, price = 0, stock_quantity = 0, is_active = TRUE
           WHERE id = ?`,
          [category.id, 'Catalog item from the PVC pipes and fittings gallery. Contact the store for current pricing and availability.', productId]
        );
        await connection.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
      } else {
        const [result] = await connection.query(
          `INSERT INTO products (category_id, name, description, price, stock_quantity, is_active)
           VALUES (?, ?, ?, 0, 0, TRUE)`,
          [category.id, productName, 'Catalog item from the PVC pipes and fittings gallery. Contact the store for current pricing and availability.']
        );
        productId = result.insertId;
      }

      await connection.query(
        'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, 0)',
        [productId, galleryImages[index]]
      );
    }

    await connection.commit();
    console.log(`Imported ${galleryImages.length} PVC catalog products.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

importProducts().catch((error) => {
  console.error('PVC catalog import failed:', error.message);
  process.exit(1);
});
