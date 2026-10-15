const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Enforce both authentication AND admin role verification
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/stats', adminController.getDashboardStats);

// Products management
router.get('/products', productController.getProducts);
router.post('/products', productController.createProduct);
router.patch('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Orders management (with products & guest info)
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:id', adminController.updateOrderStatus);

// Users management
router.get('/users', adminController.getAllUsers);

// Categories management
router.get('/categories', categoryController.getAdminCategories);
router.post('/categories', categoryController.createCategory);
router.patch('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// Reviews management
router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:id', adminController.deleteReview);

module.exports = router;
