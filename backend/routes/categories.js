const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET all (admin=true returns all including inactive)
router.get('/', async (req, res) => {
  try {
    const admin = req.query.admin === 'true';
    const where = admin ? '' : 'WHERE is_active = true';
    const result = await db.query(`SELECT * FROM categories ${where} ORDER BY sort_order ASC NULLS LAST, name_en ASC`);
    if (!admin) res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - create category
router.post('/', async (req, res) => {
  try {
    const { name_en, slug, image, sort_order } = req.body;
    const autoSlug = (slug || name_en).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const result = await db.query(
      `INSERT INTO categories (name_en, name_ar, slug, image, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
      [name_en, name_en, autoSlug, image || null, sort_order || 0]
    );
    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT - update category
router.put('/:id', async (req, res) => {
  try {
    const { name_en, slug, image, sort_order, is_active } = req.body;
    const result = await db.query(
      `UPDATE categories SET name_en=$1, name_ar=$2, slug=$3, image=$4, sort_order=$5, is_active=$6
       WHERE id=$7 RETURNING *`,
      [name_en, name_en, slug, image || null, sort_order ?? 0, is_active ?? true, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET by slug
router.get('/:slug', async (req, res) => {
  try {
    const categoryResult = await db.query('SELECT * FROM categories WHERE slug = $1', [req.params.slug]);
    if (categoryResult.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    const category = categoryResult.rows[0];
    const productsResult = await db.query(
      `SELECT p.*, c.name_en as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.category_id = $1 AND p.is_active = true ORDER BY p.created_at DESC`,
      [category.id]
    );
    res.json({ category, products: productsResult.rows });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
