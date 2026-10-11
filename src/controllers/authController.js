const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

function generateTokens(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'ecommerce_jwt_access_secret_key_2026_dev',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'ecommerce_jwt_refresh_secret_key_2026_dev',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (!db.getIsConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database is not yet connected. Please configure TiDB Cloud or MySQL credentials in server/.env.'
      });
    }

    // Check existing email
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), passwordHash, phone || null, 'customer']
    );

    const userId = result.insertId;
    // Create empty cart for customer
    await db.query('INSERT INTO carts (user_id) VALUES (?) ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP', [userId]);

    const newUser = { id: userId, name: name.trim(), email: email.toLowerCase().trim(), role: 'customer' };
    const tokens = generateTokens(newUser);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: newUser,
      tokens
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    if (!db.getIsConnected()) {
      // Demo fallback login if DB is not configured yet
      if (email === 'admin@shopapp.com' && password === 'admin123') {
        const adminUser = { id: 1, name: 'Store Admin', email: 'admin@shopapp.com', role: 'admin' };
        return res.json({
          success: true,
          message: 'Demo Admin logged in successfully (Mock DB Mode).',
          user: adminUser,
          tokens: generateTokens(adminUser)
        });
      }
      if (email === 'customer@shopapp.com' && password === 'customer123') {
        const customerUser = { id: 2, name: 'Sasi Customer', email: 'customer@shopapp.com', role: 'customer' };
        return res.json({
          success: true,
          message: 'Demo Customer logged in successfully (Mock DB Mode).',
          user: customerUser,
          tokens: generateTokens(customerUser)
        });
      }
      return res.status(503).json({
        success: false,
        message: 'Database is not yet connected. Configure TiDB Cloud in server/.env or use demo credentials (admin@shopapp.com / admin123).'
      });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    const tokens = generateTokens(userData);

    res.json({
      success: true,
      message: 'Login successful.',
      user: userData,
      tokens
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    if (!db.getIsConnected()) {
      return res.json({ success: true, user: req.user });
    }

    const [rows] = await db.query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'ecommerce_jwt_refresh_secret_key_2026_dev');
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, name: decoded.name, role: decoded.role },
      process.env.JWT_SECRET || 'ecommerce_jwt_access_secret_key_2026_dev',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};
