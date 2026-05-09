const express = require('express');
const router = express.Router();
const pool = require('../database/db');

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
    const orderId = orderResult.rows[0].id;

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

        // ✅ خصم الستوك لما الأوردر يتعمل
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

    res.status(201).json({
      message: 'Order created successfully',
      order: orderResult.rows[0]
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message, detail: error.detail });
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

    // جيب الحالة القديمة
    const oldOrder = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    if (!oldOrder.rows.length) return res.status(404).json({ error: 'Order not found' });
    const oldStatus = oldOrder.rows[0].status;

    // لو بتكنسل أوردر مش كان كنسل → رجّع الستوك
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

    // لو بترجع أوردر من كنسل لحاجة تانية → خصم الستوك تاني
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

    // رجّع الستوك
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
