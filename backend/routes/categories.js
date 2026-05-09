const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ✅ GET all categories
router.get('/', async (req, res) => {
  try {
    // Try with is_active filter first, fallback without it
    let result;
    try {
      result = await db.query(`
        SELECT * FROM categories 
        WHERE is_active = true 
        ORDER BY sort_order ASC NULLS LAST, name_en ASC
      `);
    } catch (e) {
      // is_active column might not exist
      result = await db.query(`
        SELECT * FROM categories 
        ORDER BY name_en ASC
      `);
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ GET category by slug with its products
router.get('/:slug', async (req, res) => {
  try {
    const categoryResult = await db.query(
      'SELECT * FROM categories WHERE slug = $1',
      [req.params.slug]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = categoryResult.rows[0];

    const productsResult = await db.query(`
      SELECT p.*, c.name_en as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = $1 AND p.is_active = true 
      ORDER BY p.created_at DESC
    `, [category.id]);

    res.json({
      category,
      products: productsResult.rows
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
