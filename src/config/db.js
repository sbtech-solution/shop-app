const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '4000', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shop_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  };
}

const pool = mysql.createPool(poolConfig);

let isConnected = false;

async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    isConnected = true;
    console.log(`✅ [Database] Connected successfully to ${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);
    connection.release();
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ [Database Warning] Could not connect to MySQL/TiDB at ${poolConfig.host}:${poolConfig.port}.`);
    console.warn(`   Reason: ${err.message}`);
    console.warn(`   👉 Configure TiDB Cloud or MySQL credentials in server/.env when ready.`);
    return false;
  }
}

module.exports = {
  pool,
  query: (sql, params) => pool.query(sql, params),
  execute: (sql, params) => pool.execute(sql, params),
  getConnection: () => pool.getConnection(),
  checkConnection,
  getIsConnected: () => isConnected,
};
