const express = require('express');
const router = express.Router();
const pool = require('../database/db');

let initialized = false;

async function ensureTable() {
  if (initialized) return;
  initialized = true;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipping_rates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      name_ar TEXT NOT NULL DEFAULT '',
      cost INT NOT NULL DEFAULT 80,
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipping_cities (
      id SERIAL PRIMARY KEY,
      governorate_id INT NOT NULL REFERENCES shipping_rates(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL DEFAULT '',
      cost INT,
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)
  `);

  // Always restore any missing default governorates (ON CONFLICT DO NOTHING preserves user edits)
  const defaults = [
    ['Cairo','القاهرة',60],['Giza','الجيزة',60],['Alexandria','الإسكندرية',70],
    ['Dakahlia','الدقهلية',80],['Red Sea','البحر الأحمر',100],['Beheira','البحيرة',80],
    ['Fayoum','الفيوم',80],['Gharbia','الغربية',80],['Ismailia','الإسماعيلية',80],
    ['Menofia','المنوفية',80],['Minya','المنيا',85],['Qalyubia','القليوبية',65],
    ['New Valley','الوادي الجديد',120],['Suez','السويس',80],['Aswan','أسوان',100],
    ['Assiut','أسيوط',90],['Beni Suef','بني سويف',80],['Port Said','بورسعيد',80],
    ['Damietta','دمياط',80],['Sharqia','الشرقية',80],['South Sinai','جنوب سيناء',110],
    ['Kafr El Sheikh','كفر الشيخ',80],['Matrouh','مطروح',110],['Luxor','الأقصر',100],
    ['Qena','قنا',95],['North Sinai','شمال سيناء',100],['Sohag','سوهاج',90],
  ];
  for (const [name, name_ar, cost] of defaults) {
    await pool.query(
      'INSERT INTO shipping_rates (name, name_ar, cost) VALUES ($1,$2,$3) ON CONFLICT (name) DO NOTHING',
      [name, name_ar, cost]
    );
  }
}

// GET /api/shipping — returns all active rates + free_threshold
router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const all = req.query.admin === 'true';
    const where = all ? '' : 'WHERE is_active = true';
    const { rows } = await pool.query(`SELECT * FROM shipping_rates ${where} ORDER BY name ASC`);
    const setting = await pool.query("SELECT value FROM settings WHERE key='free_shipping_threshold'");
    res.json({ rates: rows, free_threshold: parseInt(setting.rows[0]?.value || '900') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shipping/:id — update cost or is_active
router.put('/:id', async (req, res) => {
  try {
    await ensureTable();
    const { cost, is_active, name_ar } = req.body;
    await pool.query(
      `UPDATE shipping_rates SET
        cost = COALESCE($1, cost),
        is_active = COALESCE($2, is_active),
        name_ar = COALESCE($3, name_ar)
       WHERE id = $4`,
      [cost ?? null, is_active ?? null, name_ar ?? null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shipping — add new governorate
router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const { name, name_ar = '', cost = 80 } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query(
      'INSERT INTO shipping_rates (name, name_ar, cost) VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET cost=$3, is_active=true RETURNING *',
      [name, name_ar, cost]
    );
    res.json({ rate: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shipping/:id
router.delete('/:id', async (req, res) => {
  try {
    await ensureTable();
    await pool.query('DELETE FROM shipping_rates WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shipping/:id/cities
router.get('/:id/cities', async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      'SELECT * FROM shipping_cities WHERE governorate_id=$1 ORDER BY name ASC',
      [req.params.id]
    );
    res.json({ cities: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shipping/:id/cities — add city to governorate
router.post('/:id/cities', async (req, res) => {
  try {
    await ensureTable();
    const { name, name_ar = '', cost } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query(
      'INSERT INTO shipping_cities (governorate_id, name, name_ar, cost) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, name, name_ar, cost ?? null]
    );
    res.json({ city: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shipping/city/:cityId — update city
router.put('/city/:cityId', async (req, res) => {
  try {
    await ensureTable();
    const { name, name_ar, cost, is_active } = req.body;
    await pool.query(
      `UPDATE shipping_cities SET
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        cost = COALESCE($3, cost),
        is_active = COALESCE($4, is_active)
       WHERE id=$5`,
      [name ?? null, name_ar ?? null, cost ?? null, is_active ?? null, req.params.cityId]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shipping/city/:cityId
router.delete('/city/:cityId', async (req, res) => {
  try {
    await ensureTable();
    await pool.query('DELETE FROM shipping_cities WHERE id=$1', [req.params.cityId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shipping/threshold — save free shipping threshold
router.put('/threshold/set', async (req, res) => {
  try {
    const { value } = req.body;
    await pool.query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    await pool.query(
      `INSERT INTO settings (key,value) VALUES ('free_shipping_threshold',$1)
       ON CONFLICT (key) DO UPDATE SET value=$1`,
      [String(value)]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
