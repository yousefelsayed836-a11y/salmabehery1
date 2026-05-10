const express = require('express');
const router = express.Router();
const db = require('../database/db');

async function initReviewsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID,
      customer_name VARCHAR(100) NOT NULL,
      review_text TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
initReviewsTable().catch(console.error);

// GET /api/reviews  or  GET /api/reviews?product_id=xxx
router.get('/', async (req, res) => {
  try {
    const { product_id } = req.query;
    let result;
    if (product_id) {
      result = await db.query(
        'SELECT * FROM product_reviews WHERE product_id = $1 ORDER BY created_at DESC',
        [product_id]
      );
    } else {
      result = await db.query(
        'SELECT * FROM product_reviews ORDER BY created_at DESC'
      );
    }
    res.json({ success: true, reviews: result.rows });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  try {
    const { product_id, customer_name, review_text, rating } = req.body;
    if (!customer_name || !review_text || !rating) {
      return res.status(400).json({ error: 'name, review and rating are required' });
    }
    const result = await db.query(`
      INSERT INTO product_reviews (product_id, customer_name, review_text, rating)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [product_id || null, customer_name.trim(), review_text.trim(), parseInt(rating)]);
    res.json({ success: true, review: result.rows[0] });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

module.exports = router;
