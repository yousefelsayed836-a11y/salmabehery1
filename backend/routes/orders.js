const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const fetch = require('node-fetch');

const ADMIN_EMAIL = 'salmabehery14@gmail.com';

function buildEmailHtml(order, items) {
  const itemsHtml = (items || []).map(i =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${i.product_name || i.name || 'Product'}${i.size && i.size !== 'One Size' ? ` <span style="color:#aaa;font-size:12px">(${i.size})</span>` : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${i.price} EGP</td>
    </tr>`
  ).join('');
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
  <div style="background:#1a1a2e;color:#fff;padding:20px 24px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="font-size:12px;color:#fda1b7;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">New Order</div>
      <div style="font-size:22px;font-weight:800">Salma Behery ✦</div>
    </div>
    <div style="font-size:20px;font-weight:700;color:#fda1b7">#${String(order.id).slice(-6)}</div>
  </div>
  <div style="padding:20px 24px;background:#fff">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:6px 0;color:#888;font-size:13px;width:120px">Customer</td><td style="padding:6px 0;font-weight:700;font-size:14px">${order.customer_name}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Phone</td><td style="padding:6px 0;font-size:14px">${order.customer_phone}${order.phone2 ? ' / ' + order.phone2 : ''}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">Address</td><td style="padding:6px 0;font-size:14px">${order.shipping_address || order.address || '-'}</td></tr>
      <tr><td style="padding:6px 0;color:#888;font-size:13px">City</td><td style="padding:6px 0;font-size:14px">${order.city || '-'}${order.governorate ? ', ' + order.governorate : ''}</td></tr>
      ${order.notes ? `<tr><td style="padding:6px 0;color:#888;font-size:13px">Notes</td><td style="padding:6px 0;font-size:14px;color:#555">${order.notes}</td></tr>` : ''}
    </table>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <thead><tr style="background:#f8f8f8">
        <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600">ITEM</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;font-weight:600">QTY</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;font-weight:600">PRICE</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top:16px;border-top:2px solid #f0f0f0;padding-top:14px">
      ${order.shipping_cost ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;color:#888"><span>Shipping</span><span>${order.shipping_cost} EGP</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;color:#1a1a2e"><span>Total</span><span>${order.total_amount} EGP</span></div>
    </div>
  </div>
  <div style="background:#fdf0f3;padding:12px 24px;text-align:center;font-size:12px;color:#aaa">Salma Behery Store · salmabehery.com</div>
</div>`;
}

async function sendOrderEmail(order, items) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[Email] RESEND_API_KEY not set, skipping');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Salma Behery <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: `🛍️ New Order #${String(order.id).slice(-6)} — ${order.customer_name}`,
      html: buildEmailHtml(order, items),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  console.log('[Email] Sent to', ADMIN_EMAIL, '| id:', data.id);
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
    addField('phone2', phone2 || '');
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
router.get('/test-email', async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.json({ ok: false, error: 'RESEND_API_KEY غير موجود في Render — اضيف المتغير وحاول تاني' });
  }
  const fakeOrder = { id: 'TEST-001', customer_name: 'Test Customer', customer_phone: '01000000000', shipping_address: '123 Test St', city: 'Cairo', governorate: 'Cairo', notes: '', shipping_cost: 50, total_amount: 550 };
  try {
    await sendOrderEmail(fakeOrder, [{ product_name: 'Test Product', quantity: 1, price: 100 }]);
    res.json({ ok: true, to: ADMIN_EMAIL });
  } catch (e) {
    console.error('[Email] Test failed:', e.message);
    res.json({ ok: false, error: e.message });
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
