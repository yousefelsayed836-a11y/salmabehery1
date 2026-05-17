const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const https = require('https');

function buildEmailHtml(order, items) {
  const itemsHtml = (items || []).map(i =>
    `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${i.product_name || i.name || 'منتج'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${i.price} EGP</td>
    </tr>`
  ).join('');
  return `
<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#1a1a2e;color:#fff;padding:20px;text-align:center">
    <h2 style="margin:0">🛍️ طلب جديد #${order.id}</h2>
  </div>
  <div style="padding:20px">
    <p><strong>العميل:</strong> ${order.customer_name}</p>
    <p><strong>الهاتف:</strong> ${order.customer_phone}</p>
    <p><strong>العنوان:</strong> ${order.shipping_address || ''} — ${order.city || order.customer_city || ''} ${order.governorate ? '، ' + order.governorate : ''}</p>
    ${order.notes ? `<p><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <thead><tr style="background:#f5f5f5">
        <th style="padding:8px 10px;text-align:right">المنتج</th>
        <th style="padding:8px 10px">الكمية</th>
        <th style="padding:8px 10px;text-align:right">السعر</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top:16px;text-align:left">
      <p style="margin:4px 0"><strong>الشحن:</strong> ${order.shipping_cost} EGP</p>
      <p style="margin:4px 0;font-size:18px;color:#1a1a2e"><strong>الإجمالي: ${order.total_amount} EGP</strong></p>
    </div>
  </div>
</div>`;
}

async function sendOrderEmail(order, items) {
  const key = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL || 'salmabehery14@gmail.com';
  if (!key) { console.log('[Email] No RESEND_API_KEY set, skipping email'); return; }

  const body = JSON.stringify({
    from: 'Salma Behery Store <onboarding@resend.dev>',
    to: [adminEmail],
    subject: `🛍️ طلب جديد #${order.id} — ${order.customer_name}`,
    html: buildEmailHtml(order, items),
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[Email] Sent successfully to', adminEmail);
        } else {
          console.error('[Email] Resend error:', res.statusCode, data);
        }
        resolve();
      });
    });
    req.on('error', e => { console.error('[Email] Request error:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

async function getTableColumns(tableName) {
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
    `, [tableName]);
    return result.rows.map(r => r.column_name);
  } catch (e) {
    return [];
  }
}

// ✅ إنشاء أوردر + خصم الستوك
router.post('/', async (req, res) => {
  try {
    const {
      customer_name, customer_phone, phone2,
      shipping_address, customer_city, city,
      address, items, notes,
      governorate, shipping_cost: reqShipping,
      subtotal, total_amount
    } = req.body;

    const finalCustomerName = customer_name || req.body.fullName || '';
    const finalPhone = customer_phone || req.body.phone || '';
    const finalAddress = shipping_address || address || '';
    const finalCity = customer_city || city || '';
    const finalNotes = notes || '';

    if (!finalCustomerName) return res.status(400).json({ error: 'customer_name is required' });
    if (!finalPhone) return res.status(400).json({ error: 'customer_phone is required' });
    if (!finalAddress) return res.status(400).json({ error: 'shipping_address is required' });

    let itemsTotal = 0;
    if (items && Array.isArray(items)) {
      for (const item of items) {
        itemsTotal += (item.price * item.quantity);
      }
    }

    const shipping_cost = reqShipping !== undefined ? reqShipping : (itemsTotal >= 900 ? 0 : 100);
    const total = total_amount || (itemsTotal + shipping_cost);

    const orderColumns = await getTableColumns('orders');
    const orderFields = [];
    const orderValues = [];

    const addField = (col, val) => {
      if (orderColumns.includes(col)) { orderFields.push(col); orderValues.push(val); }
    };

    addField('customer_name', finalCustomerName);
    addField('customer_phone', finalPhone);
    addField('shipping_address', finalAddress);
    if (!orderColumns.includes('shipping_address') && orderColumns.includes('address')) {
      orderFields.push('address'); orderValues.push(finalAddress);
    }
    addField('city', finalCity);
    addField('governorate', governorate || '');
    addField('total_amount', total);
    addField('shipping_cost', shipping_cost);
    addField('notes', finalNotes);
    addField('status', 'pending');
    addField('payment_method', 'cash_on_delivery');

    const orderQuery = `
      INSERT INTO orders (${orderFields.join(', ')})
      VALUES (${orderValues.map((_, i) => '$' + (i + 1)).join(', ')})
      RETURNING *
    `;

    const orderResult = await pool.query(orderQuery, orderValues);
    const newOrder = orderResult.rows[0];
    const orderId = newOrder.id;

    const itemColumns = await getTableColumns('order_items');

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemFields = ['order_id', 'product_id', 'quantity', 'price'];
        const itemValues = [orderId, item.product_id, item.quantity, item.price];

        if (itemColumns.includes('product_name') && item.product_name) {
          itemFields.push('product_name'); itemValues.push(item.product_name);
        }
        if (itemColumns.includes('size') && item.size) {
          itemFields.push('size'); itemValues.push(item.size);
        }
        if (itemColumns.includes('total')) {
          itemFields.push('total'); itemValues.push(item.price * item.quantity);
        }

        await pool.query(
          `INSERT INTO order_items (${itemFields.join(', ')}) VALUES (${itemValues.map((_, i) => '$' + (i + 1)).join(', ')})`,
          itemValues
        );

        try {
          await pool.query(
            'UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2',
            [item.quantity, item.product_id]
          );
        } catch (e) {
          console.error('Stock deduction error:', e.message);
        }
      }
    }

    // SSE broadcast to admin
    const broadcast = req.app.get('broadcast');
    if (broadcast) {
      broadcast({ type: 'new_order', order: { id: newOrder.id, customer_name: finalCustomerName, total_amount: total, city: finalCity } });
    }

    // Socket.io emit
    try {
      const io = req.app.get('io');
      if (io) io.to('orders').emit('new_order', { id: newOrder.id, customer_name: finalCustomerName, total_amount: total });
    } catch (e) {}

    sendOrderEmail(newOrder, items).catch(e => console.error('[Email] Failed:', e.message));

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message, detail: error.detail });
  }
});

// Test email endpoint
router.post('/test-email', async (req, res) => {
  const fakeOrder = { id: 'TEST-001', customer_name: 'Test', customer_phone: '01000000000', shipping_address: 'Test Address', city: 'Cairo', governorate: '', notes: '', shipping_cost: 50, total_amount: 550 };
  try {
    await sendOrderEmail(fakeOrder, [{ product_name: 'Test Product', quantity: 1, price: 500 }]);
    res.json({ ok: true, to: process.env.ADMIN_EMAIL || 'salmabehery14@gmail.com' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// كل الأوردرات
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*,
        (SELECT json_agg(oi.*) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// أوردر واحد
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*,
        (SELECT json_agg(oi.*) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o WHERE o.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ تغيير الحالة + رجوع الستوك لو اتكنسل
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const oldOrder = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    if (!oldOrder.rows.length) return res.status(404).json({ error: 'Order not found' });
    const oldStatus = oldOrder.rows[0].status;

    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const items = await pool.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );
      for (const item of items.rows) {
        try {
          await pool.query(
            'UPDATE products SET stock = stock + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        } catch (e) {
          console.error('Stock restore error:', e.message);
        }
      }
      console.log(`✅ Stock restored for cancelled order ${orderId}`);
    }

    if (oldStatus === 'cancelled' && status !== 'cancelled') {
      const items = await pool.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );
      for (const item of items.rows) {
        try {
          await pool.query(
            'UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2',
            [item.quantity, item.product_id]
          );
        } catch (e) {
          console.error('Stock deduction error:', e.message);
        }
      }
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, orderId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// حذف أوردر + رجوع الستوك
router.delete('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    const items = await pool.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );
    for (const item of items.rows) {
      try {
        await pool.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      } catch (e) {}
    }

    await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    res.json({ success: true, message: 'Order deleted and stock restored' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
