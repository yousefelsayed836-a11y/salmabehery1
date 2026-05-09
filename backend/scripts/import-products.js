const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port:5432,
  user: 'postgres',
  password: '2255',
  database: 'salmabehery'
});

const COLLECTION_TO_CATEGORY = {
  'Jewelry': 'jewelry',
  'Rings': 'rings',
  'Bracelet': 'bracelet',
  'Necklace': 'necklace',
  'Hand Chains': 'hand-chains',
  'Extra things': 'extra-things',
  'new collection': 'new-collection',
  'Extra Things': 'extra-things',
  'New Collection': 'new-collection'
};

function extractMaterial(description) {
    const desc = (description || '').toLowerCase();
    if (desc.includes('gold plated') || desc.includes('gold-plated')) return 'Gold Plated';
    if (desc.includes('platinum')) return 'Platinum';
    if (desc.includes('stainless steel') || desc.includes('stainless')) return 'Stainless Steel';
    return 'Other';
}

function extractWaterResistance(description) {
    const desc = (description || '').toLowerCase();
    if (desc.includes('water') || desc.includes('perfume') || desc.includes('will not affected')) {
        return 'Water & Perfume Resistant';
    }
    return null;
}

function extractSizeInfo(description) {
    const desc = description || '';
    const sizeMatch = desc.match(/size\s*[:\-]?\s*(\d+)/i);
    if (sizeMatch) return sizeMatch[1];
    if (desc.toLowerCase().includes('free size')) return 'Free Size';
    return null;
}

function parseImages(imagesStr) {
    if (!imagesStr) return [];
    // Split by whitespace (spaces, tabs, newlines) and filter valid URLs
    return imagesStr
        .split(/\s+/)
        .map(url => url.trim())
        .filter(url => url.length > 0 && url.startsWith('http'));
}

function parseCollections(collectionsStr) {
    if (!collectionsStr) return [];
    return collectionsStr.split(',').map(c => c.trim()).filter(Boolean);
}

function getRowValue(row, ...keys) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key].toString().trim() !== '') {
            return row[key].toString().trim();
        }
    }
    return '';
}

function detectCategory(title, description, collections) {
    const text = (title + ' ' + description).toLowerCase();

    // Arabic keywords
    if (text.includes('خاتم') || text.includes('ring')) return 'rings';
    if (text.includes('سوار') || text.includes('اسواره') || text.includes('اساور') || text.includes('bracelet') || text.includes('bangle')) return 'bracelet';
    if (text.includes('سلسله') || text.includes('سلسال') || text.includes('قلاده') || text.includes('necklace')) return 'necklace';
    if (text.includes('سلسله يد') || text.includes('hand chain') || text.includes('hand-chain')) return 'hand-chains';
    if (text.includes('حلق') || text.includes('earring') || text.includes('حجاب') || text.includes('hijab') || text.includes('منظم') || text.includes('organizer')) return 'extra-things';

    for (const col of collections) {
        const slug = COLLECTION_TO_CATEGORY[col];
        if (slug) return slug;
    }

    if (text.includes('ring')) return 'rings';
    if (text.includes('bracelet') || text.includes('bangle')) return 'bracelet';
    if (text.includes('necklace') || text.includes('pendant') || text.includes('chain')) return 'necklace';
    if (text.includes('hand chain')) return 'hand-chains';
    if (text.includes('earring') || text.includes('cuff') || text.includes('pin') || text.includes('organizer')) return 'extra-things';

    return null;
}

async function importProducts() {
    const csvPath = path.join(__dirname, '..', 'uploads', 'products.csv');

    console.log('Reading CSV:', csvPath);

    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found!');
        process.exit(1);
    }

    const rows = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Total rows: ${rows.length}`);

    const client = await pool.connect();
    let categoriesMap = {};
    try {
        const catResult = await client.query('SELECT id, slug FROM categories');
        catResult.rows.forEach(cat => {
            categoriesMap[cat.slug] = cat.id;
        });
        console.log(`Loaded ${catResult.rows.length} categories:`, Object.keys(categoriesMap));
    } catch (err) {
        console.error('Error loading categories:', err.message);
    }

    const productMap = new Map();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        let handle = getRowValue(row, 'Handle', 'handle', 'Product Handle', 'Slug', 'ID');

        if (!handle) {
            const url = getRowValue(row, 'URL', 'url');
            if (url) {
                const parts = url.split('/');
                handle = parts[parts.length - 1] || null;
            }
        }

        if (!handle) {
            console.warn(`Row ${i}: No handle found, skipping`);
            continue;
        }

        if (!productMap.has(handle)) {
            const title = getRowValue(row, 'Title', 'Product Title');
            const description = getRowValue(row, 'Description', 'Body (HTML)', 'Body');
            const imagesStr = getRowValue(row, 'Images', 'Image Src', 'Image');
            const collectionsStr = getRowValue(row, 'Collections', 'Product Category', 'Category');
            const status = getRowValue(row, 'Status') || 'ACTIVE';

            const images = parseImages(imagesStr);
            const collections = parseCollections(collectionsStr);

            const categorySlug = detectCategory(title, description, collections);
            const categoryId = categorySlug ? categoriesMap[categorySlug] : null;

            if (!categoryId) {
                console.warn(`⚠️ No category for: ${title} (detected: ${categorySlug})`);
            }

            // Debug images
            if (images.length === 0 && imagesStr) {
                console.warn(`⚠️ No images parsed for: ${title}`);
                console.warn(`   Raw images string: "${imagesStr.substring(0, 100)}..."`);
            }

            productMap.set(handle, {
                handle,
                name_en: title,
                name_ar: title,
                description_en: description,
                description_ar: description,
                price: parseFloat(getRowValue(row, 'Regular Price', 'Variant Price', 'Price')) || 0,
                old_price: parseFloat(getRowValue(row, 'Sale Price', 'Compare At Price')) || null,
                material: extractMaterial(description),
                water_resistance: extractWaterResistance(description),
                size_info: extractSizeInfo(description),
                category_id: categoryId,
                images: images,
                main_image: images.length > 0 ? images[0] : null,
                stock: parseInt(getRowValue(row, 'Quantity', 'Variant Inventory Qty', 'Stock')) || 0,
                is_active: status.toUpperCase() === 'ACTIVE',
                is_featured: false,
                variants: []
            });
        }

        const opt1Name = getRowValue(row, 'Option1 Name');
        const opt1Value = getRowValue(row, 'Option1 Value');
        const opt2Name = getRowValue(row, 'Option2 Name');
        const opt2Value = getRowValue(row, 'Option2 Value');
        const qty = parseInt(getRowValue(row, 'Quantity', 'Variant Inventory Qty', 'Stock')) || 0;

        const product = productMap.get(handle);

        if (opt1Name && opt1Value) {
            product.variants.push({
                option_name: opt1Name.toLowerCase(),
                option_value: opt1Value,
                quantity: qty
            });
            if (opt1Name.toLowerCase() === 'size' && !product.size_info) {
                product.size_info = opt1Value;
            }
        }

        if (opt2Name && opt2Value) {
            product.variants.push({
                option_name: opt2Name.toLowerCase(),
                option_value: opt2Value,
                quantity: qty
            });
        }

        if (!opt1Name && !opt2Name && qty > 0) {
            product.variants.push({
                option_name: 'default',
                option_value: 'default',
                quantity: qty
            });
        }
    }

    const products = Array.from(productMap.values());
    console.log(`\nProducts found: ${products.length}`);

    // Show image counts
    const withImages = products.filter(p => p.images.length > 0).length;
    const withoutImages = products.filter(p => p.images.length === 0).length;
    console.log(`Products with images: ${withImages}`);
    console.log(`Products without images: ${withoutImages}`);

    if (products.length === 0) {
        console.log('❌ No products found! Check CSV headers.');
        process.exit(1);
    }

    // Show first product with images
    const firstWithImages = products.find(p => p.images.length > 0);
    if (firstWithImages) {
        console.log('\nFirst product with images:');
        console.log(`  Title: ${firstWithImages.name_en}`);
        console.log(`  Images count: ${firstWithImages.images.length}`);
        console.log(`  First image: ${firstWithImages.images[0].substring(0, 80)}...`);
    }

    try {
        let created = 0;
        let updated = 0;
        let failed = 0;
        let uncategorized = 0;

        for (const productData of products) {
            try {
                let totalStock = productData.stock;
                if (productData.variants.length > 0) {
                    totalStock = productData.variants.reduce((sum, v) => sum + v.quantity, 0);
                }

                if (!productData.category_id) {
                    uncategorized++;
                }

                const existing = await client.query(
                    'SELECT id FROM products WHERE name_en = $1',
                    [productData.name_en]
                );

                let productId;

                if (existing.rows.length > 0) {
                    productId = existing.rows[0].id;
                    await client.query(`
                        UPDATE products SET
                            name_en = $1, name_ar = $2, description_en = $3, description_ar = $4,
                            price = $5, old_price = $6, material = $7, water_resistance = $8,
                            size_info = $9, category_id = $10, images = $11, main_image = $12,
                            stock = $13, is_active = $14, is_featured = $15
                        WHERE id = $16
                    `, [
                        productData.name_en, productData.name_ar,
                        productData.description_en, productData.description_ar,
                        productData.price, productData.old_price,
                        productData.material, productData.water_resistance,
                        productData.size_info, productData.category_id,
                        productData.images, productData.main_image,
                        totalStock, productData.is_active, productData.is_featured,
                        productId
                    ]);
                    updated++;
                } else {
                    const newProduct = await client.query(`
                        INSERT INTO products (
                            name_en, name_ar, description_en, description_ar,
                            price, old_price, material, water_resistance, size_info,
                            category_id, images, main_image, stock, is_active, is_featured
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                        RETURNING id
                    `, [
                        productData.name_en, productData.name_ar,
                        productData.description_en, productData.description_ar,
                        productData.price, productData.old_price,
                        productData.material, productData.water_resistance,
                        productData.size_info, productData.category_id,
                        productData.images, productData.main_image,
                        totalStock, productData.is_active, productData.is_featured
                    ]);
                    productId = newProduct.rows[0].id;
                    created++;
                }

            } catch (err) {
                console.error(`Failed: ${productData.handle} - ${err.message}`);
                failed++;
            }
        }

        console.log('\n✅ Done!');
        console.log(`   Created: ${created}`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Failed:  ${failed}`);
        console.log(`   Uncategorized: ${uncategorized}`);

    } catch (error) {
        console.error('Import error:', error);
    } finally {
        client.release();
        pool.end();
    }
}

importProducts().catch(console.error);