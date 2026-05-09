const express = require('express');
const router = express.Router();
const csv = require('csv-parser');
const { Readable } = require('stream');
const db = require('../../database/db');

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
    const desc = (description || '').toLowerCase();
    const matches = desc.match(/(\d+)\s*cm/);
    if (matches) return matches[1] + ' cm';
    if (desc.includes('free size')) return 'Free Size';
    if (desc.includes('size 7')) return 'Size 7';
    if (desc.includes('size 8')) return 'Size 8';
    if (desc.includes('size 9')) return 'Size 9';
    if (desc.includes('size 6')) return 'Size 6';
    return null;
}

function parseImages(imagesStr) {
    if (!imagesStr) return [];
    return imagesStr.split(/\s+/).filter(url => url.trim().startsWith('http'));
}

function parseCollections(collectionsStr) {
    if (!collectionsStr) return [];
    return collectionsStr.split(',').map(c => c.trim()).filter(Boolean);
}

router.post('/preview', async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded' });
        }

        const csvBuffer = req.file.buffer;
        const errors = [];
        
        const stream = Readable.from(csvBuffer.toString());
        const rows = [];
        
        await new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        const productMap = new Map();
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const handle = row.Handle?.trim();
            
            if (!handle) {
                errors.push({ row: i + 2, error: 'Missing handle' });
                continue;
            }

            if (!productMap.has(handle)) {
                productMap.set(handle, {
                    handle,
                    title: row.Title?.trim() || '',
                    description: row.Description?.trim() || '',
                    seo_title: row['SEO Title']?.trim() || '',
                    seo_description: row['SEO Description']?.trim() || '',
                    price: parseFloat(row['Regular Price']) || 0,
                    sale_price: parseFloat(row['Sale Price']) || null,
                    status: row.Status?.trim() || 'ACTIVE',
                    collections: parseCollections(row.Collections),
                    images: parseImages(row.Images),
                    material: extractMaterial(row.Description),
                    water_resistance: extractWaterResistance(row.Description),
                    size_info: extractSizeInfo(row.Description),
                    variants: [],
                    row_number: i + 2
                });
            }

            const opt1Name = row['Option1 Name']?.trim();
            const opt1Value = row['Option1 Value']?.trim();
            const opt2Name = row['Option2 Name']?.trim();
            const opt2Value = row['Option2 Value']?.trim();

            if (opt1Name && opt1Value) {
                productMap.get(handle).variants.push({
                    option_name: opt1Name,
                    option_value: opt1Value,
                    sku: row.SKU?.trim() || null,
                    quantity: parseInt(row.Quantity) || 0,
                    price_override: parseFloat(row['Regular Price']) || null
                });
            }

            if (opt2Name && opt2Value) {
                productMap.get(handle).variants.push({
                    option_name: opt2Name,
                    option_value: opt2Value,
                    sku: row.SKU?.trim() || null,
                    quantity: parseInt(row.Quantity) || 0,
                    price_override: parseFloat(row['Regular Price']) || null
                });
            }

            if (!opt1Name && !opt2Name) {
                const qty = parseInt(row.Quantity) || 0;
                if (qty > 0) {
                    productMap.get(handle).variants.push({
                        option_name: 'default',
                        option_value: 'default',
                        sku: row.SKU?.trim() || null,
                        quantity: qty,
                        price_override: null
                    });
                }
            }
        }

        const products = Array.from(productMap.values());

        res.json({
            success: true,
            total_rows: rows.length,
            products_found: products.length,
            errors: errors,
            products: products.map(p => ({
                handle: p.handle,
                title: p.title,
                price: p.price,
                status: p.status,
                collections: p.collections,
                variant_count: p.variants.length,
                total_quantity: p.variants.reduce((sum, v) => sum + v.quantity, 0),
                images_count: p.images.length
            }))
        });

    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ error: 'Failed to parse CSV', details: error.message });
    }
});

router.post('/save', async (req, res) => {
    const client = await db.connect();
    
    try {
        const { products } = req.body;
        
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: 'No products provided' });
        }

        await client.query('BEGIN');

        const results = {
            created: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        for (const productData of products) {
            try {
                const existing = await client.query(
                    'SELECT id FROM products WHERE handle = $1',
                    [productData.handle]
                );

                let productId;

                if (existing.rows.length > 0) {
                    productId = existing.rows[0].id;
                    await client.query(`
                        UPDATE products SET
                            title = $1,
                            description = $2,
                            price = $3,
                            sale_price = $4,
                            images = $5,
                            status = $6,
                            collections = $7,
                            material = $8,
                            water_resistance = $9,
                            size_info = $10,
                            seo_title = $11,
                            seo_description = $12,
                            source = 'csv',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $13
                    `, [
                        productData.title,
                        productData.description,
                        productData.price,
                        productData.sale_price,
                        JSON.stringify(productData.images),
                        productData.status,
                        JSON.stringify(productData.collections),
                        productData.material,
                        productData.water_resistance,
                        productData.size_info,
                        productData.seo_title,
                        productData.seo_description,
                        productId
                    ]);
                    results.updated++;
                } else {
                    const newProduct = await client.query(`
                        INSERT INTO products (
                            handle, title, description, price, sale_price,
                            images, status, collections, material,
                            water_resistance, size_info, seo_title,
                            seo_description, source, slug, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'csv', $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id
                    `, [
                        productData.handle,
                        productData.title,
                        productData.description,
                        productData.price,
                        productData.sale_price,
                        JSON.stringify(productData.images),
                        productData.status,
                        JSON.stringify(productData.collections),
                        productData.material,
                        productData.water_resistance,
                        productData.size_info,
                        productData.seo_title,
                        productData.seo_description,
                        productData.handle
                    ]);
                    productId = newProduct.rows[0].id;
                    results.created++;
                }

                await client.query(
                    'DELETE FROM product_variants WHERE product_id = $1',
                    [productId]
                );

                for (const variant of productData.variants) {
                    await client.query(`
                        INSERT INTO product_variants 
                        (product_id, option_name, option_value, sku, quantity, price_override)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        productId,
                        variant.option_name,
                        variant.option_value,
                        variant.sku,
                        variant.quantity,
                        variant.price_override
                    ]);
                }

            } catch (err) {
                results.failed++;
                results.errors.push({
                    handle: productData.handle,
                    error: err.message
                });
            }
        }

        await client.query('COMMIT');

        const io = req.app.get('io');
        if (io) {
            io.emit('products:updated', {
                timestamp: new Date().toISOString(),
                created: results.created,
                updated: results.updated
            });
        }

        res.json({
            success: true,
            results
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save products', details: error.message });
    } finally {
        client.release();
    }
});

router.get('/template', (req, res) => {
    const template = `Handle,Title,Description,SEO Title,SEO Description,Option1 Name,Option1 Value,Option2 Name,Option2 Value,SKU,Quantity,Regular Price,Sale Price,Images,Status,Collections
sample-ring,Sample Ring,Gold plated ring,,,size,7,,,SR001,5,250,200,https://example.com/img1.webp,ACTIVE,"Jewelry,Rings"
sample-ring,,,,,size,8,,,,3,250,,,,,
sample-bracelet,Sample Bracelet,Stainless steel bracelet,,,,,,,SB001,10,300,,https://example.com/img2.webp,ACTIVE,"Jewelry,Bracelet"`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
    res.send(template);
});

module.exports = router;