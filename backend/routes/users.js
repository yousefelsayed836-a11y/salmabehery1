const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { protect, adminOnly } = require('../middleware/auth');

// كل المستخدمين (Admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, phone, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// البروفايل
router.get('/profile', protect, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, phone, address, role FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تعديل البروفايل
router.put('/profile', protect, async (req, res) => {
  try {
    const { full_name, phone, address } = req.body;
    const result = await pool.query(
      'UPDATE users SET full_name = $1, phone = $2, address = $3 WHERE id = $4 RETURNING *',
      [full_name, phone, address, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;