/**
 * Import products from Wuilt CSV export
 * Usage: node scripts/import-products-csv.js <path-to-csv>
 * Or:    node scripts/import-products-csv.js  (uses default path)
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = process.argv[2] || path.join(__dirname, 'products.csv');
const API = process.env.API_URL || 'https://salma-backend-4imp.onrender.com/api';

// Map Wuilt collection names → our category slugs
const COLLECTION_MAP = {
  'rings': 'rings',
  'necklace': 'necklace',
  'bracelet': 'bracelet',
  'hand chains': 'hand-chains',
  'extra things': 'extra-things',
  'earrings': 'earrings',
  'jewelry': null, // generic — skip
  'new collection': null,
};

function getCategorySlug(collections) {
  if (!collections) return null;
  const parts = collections.split(',').map(s => s.trim().toLowerCase());
  for (const part of parts) {
    const slug = COLLECTION_MAP[part];
    if (slug) return slug;
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
    // Handle multi-line quoted fields
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
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchJSON(url, opts = {}) {
  const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }));
  const fn = fetch || global.fetch;
  const res = await fn(url, opts);
  return res.json();
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const text = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(text);
  const headers = rows[0];
  console.log(`Parsed ${rows.length - 1} CSV rows`);

  // Col indices (from header row)
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

  // Group rows by Handle
  const productMap = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const handle = row[iHandle]?.replace(/"/g, '').trim();
    if (!handle) continue;

    if (!productMap.has(handle)) {
      productMap.set(handle, { rows: [] });
    }
    productMap.get(handle).rows.push(row);
  }

  console.log(`Found ${productMap.size} unique products`);

  // Get existing categories
  let categories = [];
  try {
    const data = await fetchJSON(`${API}/categories?admin=true`);
    categories = Array.isArray(data) ? data : [];
    console.log(`Loaded ${categories.length} categories`);
  } catch (e) {
    console.warn('Could not load categories:', e.message);
  }

  const getCatId = (slug) => {
    const cat = categories.find(c => c.slug === slug);
    return cat ? cat.id : null;
  };

  // Delete existing products first
  console.log('\nDeleting existing products...');
  try {
    const existing = await fetchJSON(`${API}/products?limit=2000`);
    const prods = existing.products || existing || [];
    let deleted = 0;
    for (const p of prods) {
      try {
        await fetchJSON(`${API}/products/${p.id}`, { method: 'DELETE' });
        deleted++;
      } catch {}
    }
    console.log(`Deleted ${deleted} existing products`);
  } catch (e) {
    console.warn('Could not delete existing products:', e.message);
  }

  // Import new products
  let success = 0;
  let failed = 0;
  const errors = [];

  for (const [handle, { rows: pRows }] of productMap) {
    const firstRow = pRows[0];

    const title = firstRow[iTitle]?.replace(/"/g, '').trim();
    if (!title) continue; // skip variant-only rows

    const descHtml = firstRow[iDesc]?.replace(/"/g, '').trim() || '';
    const description = stripHtml(descHtml) || 'Premium jewelry piece.';

    const regPrice = parseFloat(firstRow[iRegPrice]?.replace(/"/g, '').trim()) || 0;
    const salePrice = parseFloat(firstRow[iSalePrice]?.replace(/"/g, '').trim()) || 0;
    const price = salePrice > 0 ? salePrice : regPrice;
    const oldPrice = salePrice > 0 && regPrice > salePrice ? regPrice : null;

    // Sum stock across all variants
    let totalStock = 0;
    for (const row of pRows) {
      const qtyStr = row[iQty]?.replace(/"/g, '').trim();
      const qty = parseInt(qtyStr) || 0;
      if (qty > 0) totalStock += qty;
    }

    // Get images from first row that has them
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
    const categoryId = catSlug ? getCatId(catSlug) : null;

    const payload = {
      name_en: title,
      description_en: description,
      price,
      old_price: oldPrice,
      main_image: images[0] || null,
      images,
      stock: totalStock,
      is_active: isActive,
      is_featured: false,
      category_id: categoryId,
      slug: handle,
    };

    try {
      const result = await fetchJSON(`${API}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result.error) throw new Error(result.error);
      success++;
      process.stdout.write(`\r✅ ${success} imported, ❌ ${failed} failed`);
    } catch (e) {
      failed++;
      errors.push({ handle, error: e.message });
      process.stdout.write(`\r✅ ${success} imported, ❌ ${failed} failed`);
    }

    // Small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`\n\nDone! ✅ ${success} imported, ❌ ${failed} failed`);
  if (errors.length > 0) {
    console.log('\nFailed products:');
    errors.forEach(e => console.log(`  ${e.handle}: ${e.error}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
