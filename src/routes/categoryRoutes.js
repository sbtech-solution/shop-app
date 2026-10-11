const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

router.get('/', categoryController.getCategories);
router.post('/', authenticate, requireAdmin, categoryController.createCategory);

module.exports = router;
