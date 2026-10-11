function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin access required for this action.'
    });
  }
  next();
}

module.exports = { requireAdmin };
