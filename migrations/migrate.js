const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('🔄 Starting Database Migration...');
  console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT || 4000} (User: ${process.env.DB_USER}, DB: ${process.env.DB_NAME})`);

  const connectionConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '4000', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  if (process.env.DB_SSL === 'true') {
    connectionConfig.ssl = {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    };
  }

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to database server.');

    // Ensure database exists
    const dbName = process.env.DB_NAME || 'shop_app';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);
    console.log(`✅ Using database "${dbName}".`);

    // Run schema.sql
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('✅ Schema tables verified/created successfully.');

    // Seed only default admin account (Store Admin)
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    await connection.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);`,
      ['Store Admin', 'admin@shopapp.com', adminPasswordHash, '+919876543210', 'admin']
    );

    // Clean up any default customer user and order data
    await connection.query("DELETE FROM users WHERE email = 'customer@shopapp.com';");
    await connection.query("DELETE FROM orders;");

    console.log('✅ Seed users & orders verified:');
    console.log('   - Admin:    admin@shopapp.com / admin123');
    console.log('   - Customer data: Cleared (ready for new registrations)');
    console.log('   - Order data:    Cleared');

    // Run seed.sql
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    await connection.query(seedSql);
    console.log('✅ Sample categories and products seeded.');

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('💡 Tip: If using TiDB Cloud Starter, please verify DB_HOST, DB_USER, DB_PASSWORD, and set DB_SSL=true in server/.env');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
