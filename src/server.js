const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Test DB connection on startup (non-blocking for resilient startup)
  await db.checkConnection();

  const server = app.listen(PORT, () => {
    console.log(`🚀 [Server] E-Commerce REST API is running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Products API: http://localhost:${PORT}/api/products`);
    console.log(`   Categories:   http://localhost:${PORT}/api/categories`);
  });

  const shutdown = async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    server.close(async () => {
      try {
        await db.pool.end();
        console.log('✅ Database connections closed.');
      } catch (e) {
        // Ignore
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
