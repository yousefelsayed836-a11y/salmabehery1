const express = require('express');
const router = express.Router();
const pool = require('../database/db');

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}

router.get('/:key', async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query('SELECT value FROM settings WHERE key=$1', [req.params.key]);
    res.json({ value: result.rows[0]?.value || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:key', async (req, res) => {
  try {
    await ensureTable();
    const { value } = req.body;
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
      [req.params.key, value]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
