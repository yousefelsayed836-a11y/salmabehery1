const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { protect } = require('../middleware/auth');

// عرض العربة
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ci.*, p.name_en, p.name_ar, p.price, p.main_image, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// إضافة للعربة
router.post('/', protect, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const productResult = await pool.query('SELECT stock FROM products WHERE id = $1', [product_id]);
    if (productResult.rows[0].stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock' });
    }

    const result = await pool.query(`
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id) 
      DO UPDATE SET quantity = cart_items.quantity + $3
      RETURNING *
    `, [req.user.id, product_id, quantity]);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تعديل الكمية
router.put('/:id', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [quantity, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// حذف من العربة
router.delete('/:id', protect, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;