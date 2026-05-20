const express = require('express');
const router = express.Router();
const pool = require('../database/db');

// Runs once at module load — all routes await this promise
const initPromise = (async () => {
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
      is_active BOOLEAN NOT NULL DEFAULT true,
      UNIQUE(governorate_id, name)
    )
  `);
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

  // Seed all 27 governorates in one query — ON CONFLICT DO NOTHING preserves admin edits
  await pool.query(`
    INSERT INTO shipping_rates (name, name_ar, cost) VALUES
      ('Cairo','القاهرة',60),
      ('Giza','الجيزة',60),
      ('Alexandria','الإسكندرية',70),
      ('Dakahlia','الدقهلية',80),
      ('Red Sea','البحر الأحمر',100),
      ('Beheira','البحيرة',80),
      ('Fayoum','الفيوم',80),
      ('Gharbia','الغربية',80),
      ('Ismailia','الإسماعيلية',80),
      ('Menofia','المنوفية',80),
      ('Minya','المنيا',85),
      ('Qalyubia','القليوبية',65),
      ('New Valley','الوادي الجديد',120),
      ('Suez','السويس',80),
      ('Aswan','أسوان',100),
      ('Assiut','أسيوط',90),
      ('Beni Suef','بني سويف',80),
      ('Port Said','بورسعيد',80),
      ('Damietta','دمياط',80),
      ('Sharqia','الشرقية',80),
      ('South Sinai','جنوب سيناء',110),
      ('Kafr El Sheikh','كفر الشيخ',80),
      ('Matrouh','مطروح',110),
      ('Luxor','الأقصر',100),
      ('Qena','قنا',95),
      ('North Sinai','شمال سيناء',100),
      ('Sohag','سوهاج',90)
    ON CONFLICT (name) DO NOTHING
  `);

  // Add unique constraint to existing table if missing (safe to run every start)
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shipping_cities_governorate_id_name_key'
      ) THEN
        ALTER TABLE shipping_cities ADD CONSTRAINT shipping_cities_governorate_id_name_key
          UNIQUE (governorate_id, name);
      END IF;
    END $$
  `);

  // Seed all cities in one query — joins by gov name, skips duplicates
  await pool.query(`
    INSERT INTO shipping_cities (governorate_id, name, name_ar)
    SELECT r.id, c.city, c.city_ar
    FROM shipping_rates r
    JOIN (VALUES
      ('Cairo','Cairo City','مدينة القاهرة'),('Cairo','Nasr City','مدينة نصر'),('Cairo','Heliopolis','مصر الجديدة'),('Cairo','Maadi','المعادي'),('Cairo','Zamalek','الزمالك'),('Cairo','New Cairo','القاهرة الجديدة'),('Cairo','6th of October City','مدينة 6 أكتوبر'),('Cairo','Shorouk','الشروق'),('Cairo','Badr City','مدينة بدر'),('Cairo','Obour','العبور'),
      ('Giza','Giza City','مدينة الجيزة'),('Giza','Dokki','الدقي'),('Giza','Mohandessin','المهندسين'),('Giza','Haram','الهرم'),('Giza','Imbaba','إمبابة'),('Giza','6th of October','6 أكتوبر'),('Giza','Sheikh Zayed','الشيخ زايد'),('Giza','Faysal','فيصل'),
      ('Alexandria','Alexandria City','مدينة الإسكندرية'),('Alexandria','Sidi Gaber','سيدي جابر'),('Alexandria','Smouha','سموحة'),('Alexandria','Miami','ميامي'),('Alexandria','Montaza','المنتزه'),('Alexandria','Borg El Arab','برج العرب'),('Alexandria','Abu Qir','أبو قير'),
      ('Dakahlia','Mansoura','المنصورة'),('Dakahlia','Talkha','طلخا'),('Dakahlia','Mit Ghamr','ميت غمر'),('Dakahlia','Belqas','بلقاس'),('Dakahlia','Aga','أجا'),('Dakahlia','Sherbin','شربين'),('Dakahlia','Dekernes','دكرنس'),
      ('Red Sea','Hurghada','الغردقة'),('Red Sea','Safaga','سفاجا'),('Red Sea','El Quseir','القصير'),('Red Sea','Marsa Alam','مرسى علم'),('Red Sea','Ras Gharib','رأس غارب'),
      ('Beheira','Damanhur','دمنهور'),('Beheira','Kafr El Dawwar','كفر الدوار'),('Beheira','Rashid','رشيد'),('Beheira','Edku','إدكو'),('Beheira','Abu Hummus','أبو حمص'),
      ('Fayoum','Fayoum City','مدينة الفيوم'),('Fayoum','Ibsheway','إبشواي'),('Fayoum','Sinnuris','سنورس'),('Fayoum','Tamiya','طامية'),('Fayoum','Yusuf El Seddiq','يوسف الصديق'),
      ('Gharbia','Tanta','طنطا'),('Gharbia','El Mahalla El Kubra','المحلة الكبرى'),('Gharbia','Kafr El Zayat','كفر الزيات'),('Gharbia','Zefta','زفتى'),('Gharbia','El Sadat City','مدينة السادات'),
      ('Ismailia','Ismailia City','مدينة الإسماعيلية'),('Ismailia','Fayed','فايد'),('Ismailia','Qantara','القنطرة'),('Ismailia','El Tal El Kabir','التل الكبير'),
      ('Menofia','Shebin El Kom','شبين الكوم'),('Menofia','Menouf','منوف'),('Menofia','Ashmoun','أشمون'),('Menofia','Quesna','قويسنا'),('Menofia','Sadat City','مدينة السادات'),('Menofia','Birket El Sab','بركة السبع'),('Menofia','Tala','تلا'),('Menofia','El Bagor','الباجور'),('Menofia','El Shohadaa','الشهداء'),('Menofia','Sers El Lian','سرس الليان'),
      ('Minya','Minya City','مدينة المنيا'),('Minya','Abu Qurqas','أبو قرقاص'),('Minya','Mallawi','ملوي'),('Minya','Maghagha','مغاغة'),('Minya','Beni Mazar','بني مزار'),('Minya','Matay','مطاي'),
      ('Qalyubia','Banha','بنها'),('Qalyubia','Shubra El Kheima','شبرا الخيمة'),('Qalyubia','Qalyub','قليوب'),('Qalyubia','Khanka','الخانكة'),('Qalyubia','Tukh','طوخ'),('Qalyubia','Qaha','قها'),
      ('New Valley','Kharga','الخارجة'),('New Valley','Dakhla','الداخلة'),('New Valley','Farafra','الفرافرة'),('New Valley','Baris','باريس'),
      ('Suez','Suez City','مدينة السويس'),('Suez','Ain Sokhna','العين السخنة'),('Suez','Ataqah','عتاقة'),
      ('Aswan','Aswan City','مدينة أسوان'),('Aswan','Edfu','إدفو'),('Aswan','Kom Ombo','كوم أمبو'),('Aswan','Abu Simbel','أبو سمبل'),('Aswan','Daraw','دراو'),
      ('Assiut','Assiut City','مدينة أسيوط'),('Assiut','Abnub','أبنوب'),('Assiut','Manfalut','منفلوط'),('Assiut','Dairut','ديروط'),('Assiut','El Qusiya','القوصية'),('Assiut','Sahel Selim','ساحل سليم'),
      ('Beni Suef','Beni Suef City','مدينة بني سويف'),('Beni Suef','El Fashn','الفشن'),('Beni Suef','Beba','ببا'),('Beni Suef','Nasser','ناصر'),('Beni Suef','Somsta','سمسطا'),
      ('Port Said','Port Said City','مدينة بورسعيد'),('Port Said','Port Fouad','بورفؤاد'),
      ('Damietta','Damietta City','مدينة دمياط'),('Damietta','Faraskur','فارسكور'),('Damietta','Kafr Saad','كفر سعد'),('Damietta','New Damietta','دمياط الجديدة'),('Damietta','Ras El Bar','رأس البر'),
      ('Sharqia','Zagazig','الزقازيق'),('Sharqia','10th of Ramadan','العاشر من رمضان'),('Sharqia','Belbeis','بلبيس'),('Sharqia','Abu Hammad','أبو حماد'),('Sharqia','Minya El Qamh','منيا القمح'),('Sharqia','El Husseiniya','الحسينية'),
      ('South Sinai','Sharm El Sheikh','شرم الشيخ'),('South Sinai','Dahab','دهب'),('South Sinai','Nuweiba','نويبع'),('South Sinai','Taba','طابا'),('South Sinai','Saint Catherine','سانت كاترين'),('South Sinai','El Tor','الطور'),
      ('Kafr El Sheikh','Kafr El Sheikh City','مدينة كفر الشيخ'),('Kafr El Sheikh','Desouq','دسوق'),('Kafr El Sheikh','Baltim','بلطيم'),('Kafr El Sheikh','Fouh','فوه'),('Kafr El Sheikh','Biala','بيلا'),('Kafr El Sheikh','Sidi Salem','سيدي سالم'),
      ('Matrouh','Marsa Matrouh','مرسى مطروح'),('Matrouh','Siwa','سيوة'),('Matrouh','El Alamein','العلمين'),('Matrouh','El Dabaa','الضبعة'),
      ('Luxor','Luxor City','مدينة الأقصر'),('Luxor','Esna','إسنا'),('Luxor','El Qarna','القرنة'),('Luxor','Armant','أرمنت'),
      ('Qena','Qena City','مدينة قنا'),('Qena','Nag Hammadi','نجع حمادي'),('Qena','Dishna','دشنا'),('Qena','Farshut','فرشوط'),
      ('North Sinai','Arish','العريش'),('North Sinai','Rafah','رفح'),('North Sinai','Sheikh Zuweid','الشيخ زويد'),('North Sinai','Bir El Abd','بئر العبد'),
      ('Sohag','Sohag City','مدينة سوهاج'),('Sohag','Akhmim','أخميم'),('Sohag','Tahta','طهطا'),('Sohag','El Maragha','المراغة'),('Sohag','Girga','جرجا'),('Sohag','Juhayna','جهينة')
    ) AS c(gov, city, city_ar) ON r.name = c.gov
    ON CONFLICT (governorate_id, name) DO NOTHING
  `);
})();

// GET /api/shipping
router.get('/', async (req, res) => {
  try {
    await initPromise;
    const all = req.query.admin === 'true';
    const where = all ? '' : 'WHERE is_active = true';
    const { rows } = await pool.query(`SELECT * FROM shipping_rates ${where} ORDER BY name ASC`);
    const setting = await pool.query("SELECT value FROM settings WHERE key='free_shipping_threshold'");
    res.json({ rates: rows, free_threshold: parseInt(setting.rows[0]?.value || '900') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shipping/:id
router.put('/:id', async (req, res) => {
  try {
    await initPromise;
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

// POST /api/shipping
router.post('/', async (req, res) => {
  try {
    await initPromise;
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
    await initPromise;
    await pool.query('DELETE FROM shipping_rates WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/shipping/:id/cities
router.get('/:id/cities', async (req, res) => {
  try {
    await initPromise;
    const { rows } = await pool.query(
      'SELECT * FROM shipping_cities WHERE governorate_id=$1 ORDER BY name ASC',
      [req.params.id]
    );
    res.json({ cities: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shipping/:id/cities
router.post('/:id/cities', async (req, res) => {
  try {
    await initPromise;
    const { name, name_ar = '', cost } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query(
      'INSERT INTO shipping_cities (governorate_id, name, name_ar, cost) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, name, name_ar, cost ?? null]
    );
    res.json({ city: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shipping/city/:cityId
router.put('/city/:cityId', async (req, res) => {
  try {
    await initPromise;
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
    await initPromise;
    await pool.query('DELETE FROM shipping_cities WHERE id=$1', [req.params.cityId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shipping/threshold/set
router.put('/threshold/set', async (req, res) => {
  try {
    await initPromise;
    const { value } = req.body;
    await pool.query(
      `INSERT INTO settings (key,value) VALUES ('free_shipping_threshold',$1)
       ON CONFLICT (key) DO UPDATE SET value=$1`,
      [String(value)]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
