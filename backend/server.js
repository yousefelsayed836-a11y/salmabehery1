const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const multer = require('multer');
const fs = require('fs');
const { initSocket } = require('./config/socket');

dotenv.config();

const app = express();

// ✅ CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Multer - memory storage
const upload = multer({ storage: multer.memoryStorage() });

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

// ✅ Bulk upload
const bulkUploadRoutes = require('./routes/admin/bulkUpload');
app.use('/api/admin/products/bulk-upload', upload.single('csv'), bulkUploadRoutes);

// ✅ Single image upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = Date.now() + '-' + req.file.originalname.replace(/\s+/g, '-');
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const BASE_URL = process.env.BASE_URL || `https://salma-backend-4imp.onrender.com`;
    res.json({
      success: true,
      url: `${BASE_URL}/uploads/${filename}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ✅ Multiple images upload
app.post('/api/upload/multiple', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const BASE_URL = process.env.BASE_URL || `https://salma-backend-4imp.onrender.com`;
    const urls = [];

    for (const file of req.files) {
      const filename = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, file.buffer);
      urls.push(`${BASE_URL}/uploads/${filename}`);
    }

    res.json({ success: true, urls });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
