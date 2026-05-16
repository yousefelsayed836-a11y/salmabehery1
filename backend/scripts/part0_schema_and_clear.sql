-- ================================================
-- Salma Behery — Products Import
-- Run parts 1→4 in Neon SQL Editor in order
-- ================================================
-- PART 0: Schema migration + clear old products
BEGIN;
CREATE TABLE IF NOT EXISTS product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
DELETE FROM product_categories;
DELETE FROM product_variants;
UPDATE order_items SET product_id = NULL WHERE product_id IS NOT NULL;
DELETE FROM products;
COMMIT;
