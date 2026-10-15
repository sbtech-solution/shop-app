const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pipeItems = [
  [90002, '1. PVC', 1],
  [90003, '2. uPVC', 2],
  [90004, '3. CPVC', 3],
];

async function orderPipeFittings() {
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
    try {
      await connection.query('ALTER TABLE products ADD COLUMN display_order INT NOT NULL DEFAULT 0');
    } catch (error) {
      if (!/duplicate|exists/i.test(error.message)) throw error;
    }

    for (const [productId, name, displayOrder] of pipeItems) {
      await connection.query(
        `UPDATE products
         SET category_id = 4,
             name = ?,
             description = ?,
             price = 0,
             display_order = ?,
             is_active = TRUE
         WHERE id = ?`,
        [
          name,
          'Pipe fitting catalog item. Contact the store for current price and availability.',
          displayOrder,
          productId,
        ]
      );
    }

    console.log('Pipe Fittings order saved: 1. PVC, 2. uPVC, 3. CPVC.');
  } finally {
    await connection.end();
  }
}

orderPipeFittings().catch((error) => {
  console.error('Pipe Fittings ordering failed:', error.message);
  process.exit(1);
});
