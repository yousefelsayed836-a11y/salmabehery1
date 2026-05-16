const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../../database/db');

const COLLECTION_MAP = {
  'rings': 'rings',
  'necklace': 'necklace',
  'bracelet': 'bracelet',
  'hand chains': 'hand-chains',
  'extra things': 'extra-things',
  'earrings': 'earrings',
};

function getCategorySlug(collections) {
  if (!collections) return null;
  const parts = collections.split(',').map(s => s.trim().toLowerCase());
  for (const part of parts) {
    if (COLLECTION_MAP[part]) return COLLECTION_MAP[part];
  }
  return null;
}

function parseCSVLine(line) {
  const result = [];
  let inQuote = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const rows = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    let quoteCount = (line.match(/"/g) || []).length;
    while (quoteCount % 2 !== 0 && i + 1 < lines.length) {
      i++;
      line += '\n' + lines[i];
      quoteCount = (line.match(/"/g) || []).length;
    }
    rows.push(parseCSVLine(line));
    i++;
  }
  return rows;
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// POST /api/admin/import-products  (protected by secret key)
router.post('/', async (req, res) => {
  const secret = req.headers['x-import-secret'] || req.query.secret;
  if (secret !== (process.env.IMPORT_SECRET || 'salma-import-2026')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const csvPath = path.join(__dirname, '../../scripts/products.csv');
  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'CSV file not found at ' + csvPath });
  }

  try {
    const text = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(text);
    const headers = rows[0];

    const H = (name) => headers.findIndex(h => h.replace(/"/g, '').trim() === name);
    const iHandle = H('Handle');
    const iTitle = H('Title');
    const iDesc = H('Description');
    const iQty = H('Quantity');
    const iRegPrice = H('Regular Price');
    const iSalePrice = H('Sale Price');
    const iImages = H('Images');
    const iStatus = H('Status');
    const iCollections = H('Collections');

    // Group by handle
    const productMap = new Map();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const handle = row[iHandle]?.replace(/"/g, '').trim();
      if (!handle) continue;
      if (!productMap.has(handle)) productMap.set(handle, []);
      productMap.get(handle).push(row);
    }

    // Load categories
    const catResult = await pool.query('SELECT id, slug FROM categories');
    const catMap = {};
    catResult.rows.forEach(c => { catMap[c.slug] = c.id; });

    // Delete all existing products
    await pool.query('DELETE FROM order_items WHERE product_id IN (SELECT id FROM products)');
    await pool.query('DELETE FROM products');

    let imported = 0;
    let skipped = 0;

    for (const [handle, pRows] of productMap) {
      const firstRow = pRows[0];
      const title = firstRow[iTitle]?.replace(/"/g, '').trim();
      if (!title) { skipped++; continue; }

      const descHtml = firstRow[iDesc]?.replace(/"/g, '').trim() || '';
      const description = stripHtml(descHtml) || 'Premium jewelry piece.';

      const regPrice = parseFloat(firstRow[iRegPrice]?.replace(/"/g, '').trim()) || 0;
      const salePrice = parseFloat(firstRow[iSalePrice]?.replace(/"/g, '').trim()) || 0;
      const price = salePrice > 0 ? salePrice : regPrice;
      const oldPrice = (salePrice > 0 && regPrice > salePrice) ? regPrice : null;

      let totalStock = 0;
      for (const row of pRows) {
        const qty = parseInt(row[iQty]?.replace(/"/g, '').trim()) || 0;
        if (qty > 0) totalStock += qty;
      }

      let images = [];
      for (const row of pRows) {
        const imgStr = row[iImages]?.replace(/"/g, '').trim();
        if (imgStr) {
          images = imgStr.split(' ').filter(u => u.startsWith('http'));
          if (images.length > 0) break;
        }
      }

      const status = firstRow[iStatus]?.replace(/"/g, '').trim();
      const isActive = status === 'ACTIVE';

      const collections = firstRow[iCollections]?.replace(/"/g, '').trim();
      const catSlug = getCategorySlug(collections);
      const categoryId = catSlug ? (catMap[catSlug] || null) : null;

      await pool.query(
        `INSERT INTO products (name_en, description_en, price, old_price, main_image, images, stock, is_active, is_featured, category_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [title, description, price, oldPrice, images[0] || null, JSON.stringify(images), totalStock, isActive, false, categoryId]
      );
      imported++;
    }

    res.json({ success: true, imported, skipped, total: productMap.size });
  } catch (e) {
    console.error('Import error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
