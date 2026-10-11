-- ===================================================
-- Seed Data for E-Commerce App
-- ===================================================

-- Initial Categories
INSERT INTO categories (id, name, slug, image_url, is_active) VALUES
(1, 'Electronics', 'electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&auto=format&fit=crop&q=60', TRUE),
(2, 'Fashion', 'fashion', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&auto=format&fit=crop&q=60', TRUE),
(3, 'Home & Living', 'home-living', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=60', TRUE),
(4, 'Beauty', 'beauty', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=60', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Initial Products
INSERT INTO products (id, category_id, name, description, price, stock_quantity, is_active) VALUES
(1, 1, 'Wireless Noise-Canceling Headphones', 'Premium sound experience with 40-hour battery life and active noise cancellation.', 1299.00, 45, TRUE),
(2, 1, 'Smart Watch Active 2', 'Fitness tracking smartwatch with AMOLED display, heart rate sensor, and waterproof body.', 2499.00, 30, TRUE),
(3, 1, 'Ultra-Slim 20,000mAh Power Bank', 'High-speed dual USB-C output power bank with fast charging support.', 899.00, 80, TRUE),
(4, 2, 'Classic Cotton Casual Shirt', 'Breathable organic cotton shirt, tailor-fitted for everyday elegance.', 699.00, 50, TRUE),
(5, 2, 'Urban Lightweight Running Shoes', 'Ergonomic sole cushioning designed for high agility and long-distance runs.', 1499.00, 25, TRUE),
(6, 3, 'Nordic Minimalist Desk Lamp', 'Adjustable warm-to-cool LED lighting with touch dimmer and metallic base.', 799.00, 40, TRUE),
(7, 4, 'Organic Vitamin C Facial Serum', 'Rejuvenating glow serum infused with natural botanical extracts and hyaluronic acid.', 499.00, 60, TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Product Images
INSERT INTO product_images (product_id, image_url, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', 1),
(2, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80', 1),
(3, 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80', 1),
(4, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80', 1),
(5, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', 1),
(6, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80', 1),
(7, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80', 1);
