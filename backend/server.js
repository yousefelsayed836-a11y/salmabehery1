const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const multer = require('multer');
const fs = require('fs');
const compression = require('compression');
const { initSocket } = require('./config/socket');
const db = require('./database/db');
dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.use(compression());

// ✅ CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ✅ Static uploads (legacy URLs)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, { maxAge: '1y', immutable: true }));

// ✅ Socket.IO
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reviews', require('./routes/reviews'));

// ✅ Bulk upload CSV
const bulkUploadRoutes = require('./routes/admin/bulkUpload');
app.use('/api/admin/products/bulk-upload', upload.single('csv'), bulkUploadRoutes);

// ✅ Settings (favicon, etc.)
app.use('/api/settings', require('./routes/settings'));

// ✅ Shipping rates & governorates
app.use('/api/shipping', require('./routes/shipping'));

// ✅ One-time CSV import
app.use('/api/admin/import-products', require('./routes/admin/importProducts'));

// ✅ Ensure uploaded_images table exists
db.query(`
  CREATE TABLE IF NOT EXISTS uploaded_images (
    id BIGSERIAL PRIMARY KEY,
    mime_type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => console.error('DB image table init error:', e.message));

// ✅ Serve image from DB
app.get('/api/images/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT mime_type, data FROM uploaded_images WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).end();
    const { mime_type, data } = result.rows[0];
    const buf = Buffer.from(data, 'base64');
    res.set('Content-Type', mime_type);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buf);
  } catch (e) {
    res.status(500).end();
  }
});

// ✅ Upload image — GitHub repo storage, served via raw.githubusercontent.com (instant, no CDN delay)
const fetch = require('node-fetch');
const sharp = require('sharp');
const GITHUB_REPO = 'yousefelsayed836-a11y/salmabehery1';

// Fallback: DB storage if GitHub token not available
db.query(`CREATE TABLE IF NOT EXISTS uploaded_images (
  id SERIAL PRIMARY KEY,
  mime_type VARCHAR(100),
  data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)`).catch(e => console.error('uploaded_images table init error:', e));

async function compressImage(buffer) {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch (e) {
    console.error('Image compression failed, using original:', e.message);
    return buffer;
  }
}

async function uploadToGitHub(buffer) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  const compressed = await compressImage(buffer);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const filePath = `images/${filename}`;
  const apiRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `img: ${filename}`,
        content: compressed.toString('base64'),
        branch: 'main',
      }),
    }
  );
  if (!apiRes.ok) {
    const e = await apiRes.json().catch(() => ({}));
    throw new Error(e.message || `GitHub API ${apiRes.status}`);
  }
  // Use raw.githubusercontent.com — serves immediately after commit, no CDN delay
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${filePath}`;
}

async function uploadToDB(buffer) {
  const compressed = await compressImage(buffer);
  const base64 = compressed.toString('base64');
  const result = await db.query(
    'INSERT INTO uploaded_images (mime_type, data) VALUES ($1, $2) RETURNING id',
    ['image/webp', base64]
  );
  return `/api/images/${result.rows[0].id}`;
}

async function uploadToLocal(buffer) {
  const compressed = await compressImage(buffer);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  fs.writeFileSync(path.join(uploadsDir, filename), compressed);
  return `/uploads/${filename}`;
}

async function uploadImage(file) {
  try {
    const url = await uploadToLocal(file.buffer);
    return { url, storage: 'local' };
  } catch (e) {
    console.log(`Local upload failed (${e.message}), trying GitHub`);
    try {
      const url = await uploadToGitHub(file.buffer);
      return { url, storage: 'github' };
    } catch (e2) {
      console.log(`GitHub upload failed (${e2.message}), storing in DB`);
      const url = await uploadToDB(file.buffer);
      return { url, storage: 'db' };
    }
  }
}

// ✅ Single image upload
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const { url, storage } = await uploadImage(req.file);
    res.json({ success: true, url, storage });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

// ✅ Multiple images upload
app.post('/api/upload/multiple', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });
    const results = await Promise.all(req.files.map(f => uploadImage(f)));
    const urls = results.map(r => r.url);
    const storage = results.every(r => r.storage === 'github') ? 'github' : results.some(r => r.storage === 'github') ? 'mixed' : 'db';
    res.json({ success: true, urls, storage });
  } catch (e) {
    console.error('Multiple upload error:', e);
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

// ✅ Migrate DB images → local filesystem
app.post('/api/admin/migrate-images-to-local', async (req, res) => {
  try {
    const images = await db.query('SELECT id, mime_type, data FROM uploaded_images ORDER BY id');
    const results = { migrated: 0, failed: 0, errors: [] };
    for (const img of images.rows) {
      try {
        const buf = Buffer.from(img.data, 'base64');
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        fs.writeFileSync(path.join(uploadsDir, filename), buf);
        const newUrl = `/uploads/${filename}`;
        const oldUrl = `/api/images/${img.id}`;
        await db.query(`UPDATE products SET images = array_replace(images, $1, $2) WHERE $1 = ANY(images)`, [oldUrl, newUrl]);
        await db.query(`UPDATE products SET main_image = $1 WHERE main_image = $2`, [newUrl, oldUrl]);
        await db.query(`UPDATE categories SET image = $1 WHERE image = $2`, [newUrl, oldUrl]);
        await db.query('DELETE FROM uploaded_images WHERE id = $1', [img.id]);
        results.migrated++;
      } catch (e) { results.failed++; results.errors.push(`id=${img.id}: ${e.message}`); }
    }

    // Also migrate base64 category images to local disk
    const cats = await db.query(`SELECT id, image FROM categories WHERE image IS NOT NULL AND image != '' AND image NOT LIKE 'http%' AND image NOT LIKE '/uploads/%'`);
    for (const cat of cats.rows) {
      try {
        const m = cat.image.match(/^data:([^;]+);base64,(.+)$/s);
        if (!m) continue;
        const buf = Buffer.from(m[2], 'base64');
        const compressed = await sharp(buf).rotate().resize({ width: 800, height: 1100, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
        const filename = `cat-${cat.id}-${Date.now()}.webp`;
        fs.writeFileSync(path.join(uploadsDir, filename), compressed);
        await db.query('UPDATE categories SET image = $1 WHERE id = $2', [`/uploads/${filename}`, cat.id]);
        results.migrated++;
      } catch (e) { results.failed++; results.errors.push(`cat=${cat.id}: ${e.message}`); }
    }

    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ✅ GitHub token health check
app.get('/api/admin/github-status', async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.json({ ok: false, reason: 'GITHUB_TOKEN not set' });
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (r.ok) return res.json({ ok: true });
    const e = await r.json().catch(() => ({}));
    res.json({ ok: false, reason: e.message || `GitHub ${r.status}` });
  } catch (e) {
    res.json({ ok: false, reason: e.message });
  }
});

// ✅ One-time migration: move DB images → GitHub, update product/category URLs, purge DB
app.post('/api/admin/migrate-images-to-github', async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(400).json({ error: 'GITHUB_TOKEN not set' });

  try {
    const images = await db.query('SELECT id, mime_type, data FROM uploaded_images ORDER BY id');
    const results = { migrated: 0, failed: 0, errors: [] };

    for (const img of images.rows) {
      try {
        const buf = Buffer.from(img.data, 'base64');
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const filePath = `images/${filename}`;
        const apiRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
            body: JSON.stringify({ message: `migrate: ${filename}`, content: img.data, branch: 'main' }),
          }
        );
        if (!apiRes.ok) throw new Error((await apiRes.json().catch(() => ({}))).message || `GitHub ${apiRes.status}`);

        const newUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${filePath}`;
        const oldUrl = `/api/images/${img.id}`;

        // Update products: replace old URL in images array and main_image
        await db.query(`UPDATE products SET images = array_replace(images, $1, $2) WHERE $1 = ANY(images)`, [oldUrl, newUrl]);
        await db.query(`UPDATE products SET main_image = $1 WHERE main_image = $2`, [newUrl, oldUrl]);
        // Update categories
        await db.query(`UPDATE categories SET image = $1 WHERE image = $2`, [newUrl, oldUrl]);

        // Delete from DB
        await db.query('DELETE FROM uploaded_images WHERE id = $1', [img.id]);
        results.migrated++;
      } catch (e) {
        results.failed++;
        results.errors.push(`id=${img.id}: ${e.message}`);
      }
    }

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ SSE
const clients = new Set();
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  clients.add(res);
  res.write('data: ' + JSON.stringify({ type: 'connected' }) + '\n\n');
  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

app.set('broadcast', (data) => {
  const message = 'data: ' + JSON.stringify(data) + '\n\n';
  clients.forEach(client => {
    try { client.write(message); } catch (e) {}
  });
});

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ✅ Keepalive ping (prevents Render cold start)
app.get('/api/ping', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
