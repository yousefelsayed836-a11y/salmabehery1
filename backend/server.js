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

// ✅ Upload image to GitHub repo — free, permanent, survives redeploys
const fetch = require('node-fetch');
const GITHUB_REPO = 'yousefelsayed836-a11y/salmabehery1';

async function uploadToGitHub(buffer, mimetype) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set on server');
  const ext = mimetype.includes('png') ? 'png' : mimetype.includes('webp') ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
        content: buffer.toString('base64'),
        branch: 'main',
      }),
    }
  );
  if (!apiRes.ok) {
    const e = await apiRes.json().catch(() => ({}));
    throw new Error(e.message || `GitHub API ${apiRes.status}`);
  }
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${filePath}`;
}

// ✅ Single image upload → GitHub repo
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const url = await uploadToGitHub(req.file.buffer, req.file.mimetype);
    res.json({ success: true, url });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

// ✅ Multiple images upload → GitHub repo
app.post('/api/upload/multiple', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });
    const urls = await Promise.all(req.files.map(f => uploadToGitHub(f.buffer, f.mimetype)));
    res.json({ success: true, urls });
  } catch (e) {
    console.error('Multiple upload error:', e);
    res.status(500).json({ error: 'Upload failed: ' + e.message });
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
