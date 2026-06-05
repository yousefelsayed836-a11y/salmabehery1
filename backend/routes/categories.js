const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Ensure image column is TEXT (not VARCHAR) so base64 images fit
db.query(`ALTER TABLE categories ALTER COLUMN image TYPE TEXT`).catch(() => {});

// GET all (admin=true returns all including inactive + image data)
router.get('/', async (req, res) => {
  try {
    const admin = req.query.admin === 'true';
    const where = admin ? '' : 'WHERE is_active = true';
    if (admin) {
      const result = await db.query(`SELECT * FROM categories ${where} ORDER BY sort_order ASC NULLS LAST, name_en ASC`);
      return res.json(result.rows);
    }
    // Public: return direct GitHub URL if available, else backend proxy
    const result = await db.query(
      `SELECT id, name_en, name_ar, slug, sort_order, is_active,
              (image IS NOT NULL AND image != '') AS has_image,
              CASE WHEN image LIKE 'http%' THEN image ELSE NULL END AS direct_url
       FROM categories ${where} ORDER BY sort_order ASC NULLS LAST, name_en ASC`
    );
    const rows = result.rows.map(r => ({
      ...r,
      image_url: r.has_image ? (r.direct_url || `/api/categories/image/${r.id}`) : null,
      direct_url: undefined,
    }));
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
    res.json(rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET category image — served as binary with long cache
router.get('/image/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT image FROM categories WHERE id=$1', [req.params.id]);
    if (!result.rows.length || !result.rows[0].image) return res.status(404).end();
    const img = result.rows[0].image;
    if (img.startsWith('http')) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      return res.redirect(301, img);
    }
    const m = img.match(/^data:([^;]+);base64,(.+)$/s);
    if (!m) return res.status(400).end();
    const etag = `"${m[2].length}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    const buf = Buffer.from(m[2], 'base64');
    res.set('Content-Type', m[1]);
    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buf);
  } catch (e) {
    res.status(500).end();
  }
});

// POST migrate category images from base64 DB → GitHub
router.post('/migrate-to-github', async (req, res) => {
  const fetch = require('node-fetch');
  const sharp = require('sharp');
  const token = process.env.GITHUB_TOKEN;
  const REPO = 'yousefelsayed836-a11y/salmabehery1';
  if (!token) return res.status(400).json({ error: 'GITHUB_TOKEN not set' });
  try {
    const cats = await db.query(`SELECT id, name_en, image FROM categories WHERE image IS NOT NULL AND image != '' AND image NOT LIKE 'http%'`);
    const results = { migrated: 0, failed: 0, errors: [] };
    for (const cat of cats.rows) {
      try {
        const m = cat.image.match(/^data:([^;]+);base64,(.+)$/s);
        if (!m) { results.failed++; continue; }
        const buf = Buffer.from(m[2], 'base64');
        const compressed = await sharp(buf).rotate().resize({ width: 800, height: 1100, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
        const filename = `cat-${cat.id}-${Date.now()}.webp`;
        const filePath = `images/${filename}`;
        const apiRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
          body: JSON.stringify({ message: `cat-img: ${cat.name_en}`, content: compressed.toString('base64'), branch: 'main' }),
        });
        if (!apiRes.ok) throw new Error((await apiRes.json().catch(() => ({}))).message || `GitHub ${apiRes.status}`);
        const newUrl = `https://raw.githubusercontent.com/${REPO}/main/${filePath}`;
        await db.query('UPDATE categories SET image = $1 WHERE id = $2', [newUrl, cat.id]);
        results.migrated++;
      } catch (e) {
        results.failed++;
        results.errors.push(`id=${cat.id}: ${e.message}`);
      }
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
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
