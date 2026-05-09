-- ============================================================
-- MIGRATION: Add Product Variants Support (Updated)
-- For Salma Behery Jewelry Store
-- ============================================================

-- 0. Create collections table FIRST (if not exists)
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    option_name VARCHAR(50) NOT NULL,
    option_value VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    price_override DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, option_name, option_value)
);

-- 2. Add columns to products table if not exist
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS handle VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seo_description TEXT,
    ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- 4. Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger for product_variants
DROP TRIGGER IF EXISTS update_variants_updated_at ON product_variants;
CREATE TRIGGER update_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Create view for products with variants
CREATE OR REPLACE VIEW products_with_variants AS
SELECT 
    p.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', pv.id,
                'option_name', pv.option_name,
                'option_value', pv.option_value,
                'sku', pv.sku,
                'quantity', pv.quantity,
                'price_override', pv.price_override
            ) ORDER BY pv.option_value
        ) FILTER (WHERE pv.id IS NOT NULL),
        '[]'::json
    ) as variants,
    COALESCE(SUM(pv.quantity), 0) as total_quantity
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
GROUP BY p.id;

-- 7. Seed collections
INSERT INTO collections (name, slug, description, created_at, updated_at)
VALUES 
    ('Jewelry', 'jewelry', 'Main jewelry collection', NOW(), NOW()),
    ('Rings', 'rings', 'Rings collection', NOW(), NOW()),
    ('Bracelet', 'bracelet', 'Bracelets collection', NOW(), NOW()),
    ('Necklace', 'necklace', 'Necklaces collection', NOW(), NOW()),
    ('Hand Chains', 'hand-chains', 'Hand chains collection', NOW(), NOW()),
    ('Extra things', 'extra-things', 'Extra accessories', NOW(), NOW()),
    ('new collection', 'new-collection', 'New arrivals', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;