const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: process.env.DB_SSL === 'true'
    ? { minVersion: 'TLSv1.2' }
    : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  pool,
  async checkConnection() {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully.');
      connection.release();
      return true;
    } catch (error) {
      console.error('⚠️ Database connection failed:', error.message);
      return false;
    }
  }
};