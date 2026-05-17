const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Ensure product_categories junction table exists
async function ensureProductCategoriesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS product_categories (
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, category_id)
    )
  `);
}

// ───────────────────────────────────────────────
// GET /api/products
// ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    await ensureProductCategoriesTable();
    const { collection, status, page = 1, limit = 1000, search, is_active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT
        p.id, p.name_en, p.name_ar, p.description_en, p.description_ar,
        p.price, p.old_price, p.material, p.water_resistance, p.size_info,
        p.images, p.main_image, p.stock, p.is_active, p.is_featured, p.created_at,
        c.name_en as category_name,
        c.slug as category_slug,
        COALESCE(
          (SELECT json_agg(json_build_object('id', cat.id, 'name_en', cat.name_en, 'slug', cat.slug))
           FROM product_categories pc2
           JOIN categories cat ON cat.id = pc2.category_id
           WHERE pc2.product_id = p.id),
          '[]'::json
        ) as categories,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pv.id, 'option_name', pv.option_name,
              'option_value', pv.option_value, 'sku', pv.sku,
              'quantity', pv.quantity, 'price_override', pv.price_override
            ) ORDER BY pv.option_value
          ) FILTER (WHERE pv.id IS NOT NULL),
          '[]'::json
        ) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (collection) {
      // Filter by collection using both category_id and product_categories junction
      query += `
        AND (c.slug = $${paramIndex} OR p.id IN (
          SELECT pc.product_id FROM product_categories pc
          JOIN categories cj ON cj.id = pc.category_id
          WHERE cj.slug = $${paramIndex}
        ))
      `;
      params.push(collection);
      paramIndex++;
    }

    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (is_active !== undefined) {
      query += ` AND p.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    if (search) {
      query += ` AND (p.name_en ILIKE $${paramIndex} OR p.name_ar ILIKE $${paramIndex} OR p.description_en ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY p.id, c.name_en, c.slug ORDER BY p.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    let countQuery = `
      SELECT COUNT(DISTINCT p.id) FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const countParams = [];
    let countIndex = 1;

    if (collection) {
      countQuery += `
        AND (c.slug = $${countIndex} OR p.id IN (
          SELECT pc.product_id FROM product_categories pc
          JOIN categories cj ON cj.id = pc.category_id
          WHERE cj.slug = $${countIndex}
        ))
      `;
      countParams.push(collection);
      countIndex++;
    }
    if (is_active !== undefined) {
      countQuery += ` AND p.is_active = $${countIndex}`;
      countParams.push(is_active === 'true');
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    const isPublicRead = !search && is_active !== 'false' && !status;
    if (isPublicRead) res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json({
      success: true,
      products: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// ───────────────────────────────────────────────
// GET /api/products/:id
// ───────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    await ensureProductCategoriesTable();
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        p.id, p.name_en, p.name_ar, p.description_en, p.description_ar,
        p.price, p.old_price, p.material, p.water_resistance, p.size_info,
        p.images, p.main_image, p.stock, p.is_active, p.is_featured, p.created_at,
        c.id as category_id, c.name_en as category_name, c.slug as category_slug,
        COALESCE(
          (SELECT json_agg(json_build_object('id', cat.id, 'name_en', cat.name_en, 'slug', cat.slug))
           FROM product_categories pc2
           JOIN categories cat ON cat.id = pc2.category_id
           WHERE pc2.product_id = p.id),
          '[]'::json
        ) as categories,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pv.id, 'option_name', pv.option_name,
              'option_value', pv.option_value, 'sku', pv.sku,
              'quantity', pv.quantity, 'price_override', pv.price_override
            ) ORDER BY pv.option_value
          ) FILTER (WHERE pv.id IS NOT NULL),
          '[]'::json
        ) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.id = $1
      GROUP BY p.id, c.id, c.name_en, c.slug
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const product = result.rows[0];
    // Derive category_ids array from categories
    product.category_ids = Array.isArray(product.categories)
      ? product.categories.map((c) => c.id)
      : [];

    res.json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ───────────────────────────────────────────────
// POST /api/products
// ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    await ensureProductCategoriesTable();
    const {
      name_en, name_ar, description_en, description_ar,
      price, old_price, images, main_image,
      category_id, category_ids,
      material, water_resistance, size_info,
      stock, is_active, is_featured, variants
    } = req.body;

    const resolvedPrimaryId = await resolveCategoryId(category_id || (category_ids && category_ids[0]));

    const result = await db.query(`
      INSERT INTO products (
        name_en, name_ar, description_en, description_ar,
        price, old_price, images, main_image, category_id,
        material, water_resistance, size_info,
        stock, is_active, is_featured,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      name_en, name_ar || name_en, description_en || null, description_ar || null,
      price, old_price || null,
      images || [], main_image || (images && images.length > 0 ? images[0] : null),
      resolvedPrimaryId,
      material || null, water_resistance || null, size_info || null,
      stock || 0, is_active !== undefined ? is_active : true, is_featured || false
    ]);

    const productId = result.rows[0].id;

    // Save to product_categories junction
    const allCategoryIds = category_ids
      ? await resolveAllCategoryIds(category_ids)
      : (resolvedPrimaryId ? [resolvedPrimaryId] : []);
    for (const catId of allCategoryIds) {
      await db.query(
        `INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [productId, catId]
      );
    }

    if (variants && variants.length > 0) {
      for (const v of variants) {
        await db.query(
          `INSERT INTO product_variants (product_id, option_name, option_value, sku, quantity, price_override)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [productId, v.option_name || 'default', v.option_value || 'default', v.sku || null, v.quantity || 0, v.price_override || null]
        );
      }
    }

    const full = await getFullProduct(productId);
    res.json({ success: true, product: full });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ error: 'Failed to add product', details: error.message });
  }
});

// ───────────────────────────────────────────────
// PUT /api/products/:id
// ───────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    await ensureProductCategoriesTable();
    const { id } = req.params;
    const {
      name_en, name_ar, description_en, description_ar,
      price, old_price, images, main_image,
      category_id, category_ids,
      material, water_resistance, size_info,
      stock, is_active, is_featured, variants
    } = req.body;

    const existing = await db.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const resolvedPrimaryId = category_ids
      ? await resolveCategoryId(category_ids[0] || null)
      : category_id !== undefined
        ? await resolveCategoryId(category_id)
        : undefined;

    await db.query(`
      UPDATE products SET
        name_en = COALESCE($1, name_en),
        name_ar = COALESCE($2, name_ar),
        description_en = COALESCE($3, description_en),
        description_ar = COALESCE($4, description_ar),
        price = COALESCE($5, price),
        old_price = $6,
        images = COALESCE($7, images),
        main_image = COALESCE($8, main_image),
        category_id = COALESCE($9, category_id),
        material = COALESCE($10, material),
        water_resistance = COALESCE($11, water_resistance),
        size_info = COALESCE($12, size_info),
        stock = COALESCE($13, stock),
        is_active = COALESCE($14, is_active),
        is_featured = COALESCE($15, is_featured),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
    `, [
      name_en, name_ar, description_en, description_ar,
      price, old_price !== undefined ? (old_price || null) : undefined,
      images, main_image,
      resolvedPrimaryId !== undefined ? resolvedPrimaryId : null,
      material, water_resistance, size_info,
      stock, is_active, is_featured, id
    ]);

    // Update product_categories junction if category_ids provided
    if (category_ids !== undefined) {
      await db.query('DELETE FROM product_categories WHERE product_id = $1', [id]);
      const allCatIds = await resolveAllCategoryIds(category_ids);
      for (const catId of allCatIds) {
        await db.query(
          `INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [id, catId]
        );
      }
    }

    if (variants && Array.isArray(variants)) {
      await db.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
      for (const v of variants) {
        await db.query(
          `INSERT INTO product_variants (product_id, option_name, option_value, sku, quantity, price_override)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, v.option_name || 'default', v.option_value || 'default', v.sku || null, v.quantity || 0, v.price_override || null]
        );
      }
    }

    const full = await getFullProduct(id);
    res.json({ success: true, product: full });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// ───────────────────────────────────────────────
// PATCH /api/products/:id/toggle
// ───────────────────────────────────────────────
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (is_active === undefined) return res.status(400).json({ error: 'is_active required' });
    const result = await db.query(
      `UPDATE products SET is_active=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, name_en, is_active`,
      [is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle product status' });
  }
});

// ───────────────────────────────────────────────
// DELETE /api/products/:id
// ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    await db.query('DELETE FROM product_categories WHERE product_id = $1', [id]);
    await db.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ─── Helpers ──────────────────────────────────

async function resolveCategoryId(category_id) {
  if (!category_id) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(category_id)) return category_id;
  const r = await db.query('SELECT id FROM categories WHERE slug=$1 OR name_en ILIKE $2 LIMIT 1', [category_id.toLowerCase(), category_id]);
  return r.rows[0]?.id || null;
}

async function resolveAllCategoryIds(ids) {
  if (!ids || !ids.length) return [];
  const resolved = [];
  for (const id of ids) {
    const r = await resolveCategoryId(id);
    if (r) resolved.push(r);
  }
  return resolved;
}

async function getFullProduct(id) {
  const r = await db.query(`
    SELECT p.*, c.name_en as category_name, c.slug as category_slug,
      COALESCE(
        (SELECT json_agg(json_build_object('id', cat.id, 'name_en', cat.name_en, 'slug', cat.slug))
         FROM product_categories pc2
         JOIN categories cat ON cat.id = pc2.category_id
         WHERE pc2.product_id = p.id),
        '[]'::json
      ) as categories,
      COALESCE(
        json_agg(json_build_object(
          'id', pv.id, 'option_name', pv.option_name,
          'option_value', pv.option_value, 'sku', pv.sku,
          'quantity', pv.quantity, 'price_override', pv.price_override
        )) FILTER (WHERE pv.id IS NOT NULL), '[]'::json
      ) as variants
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    WHERE p.id = $1
    GROUP BY p.id, c.name_en, c.slug
  `, [id]);
  const product = r.rows[0];
  if (product) {
    product.category_ids = Array.isArray(product.categories) ? product.categories.map(c => c.id) : [];
  }
  return product;
}

module.exports = router;
