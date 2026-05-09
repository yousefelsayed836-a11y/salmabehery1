"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Head from "next/head";

interface CartItem {
  product: {
    id: string;
    name_en: string;
    price: number;
    image_url?: string;
  };
  qty: number;
  size: string;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const updateQty = (id: string, size: string, delta: number) => {
    const newCart = cart.map(i => i.product.id === id && i.size === size ? { ...i, qty: Math.max(1, i.qty + delta) } : i);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (id: string, size: string) => {
    const newCart = cart.filter(i => !(i.product.id === id && i.size === size));
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const freeShipping = total >= 900;

  return (
    <>
      <Head><title>Cart — Salma Behery</title></Head>
      <style jsx global>{`*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',sans-serif;background:#f5f5f5}`}</style>

      <header style={{ background: '#1a1a2e', color: '#fff', padding: '16px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#fda1b7', fontSize: '20px', fontWeight: 800 }}>Salma Behery.</Link>
          <span style={{ fontSize: '14px' }}>Shopping Cart</span>
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: 700 }}>Your Cart ({cart.reduce((s,i)=>s+i.qty,0)} items)</h1>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px' }}>
            <p style={{ fontSize: '18px', color: '#999', marginBottom: '20px' }}>Your cart is empty</p>
            <Link href="/" style={{ padding: '12px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #fda1b7, #f78fa3)', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '16px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f5f5f5' }}>
                  <img src={item.product.image_url || ''} alt="" style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{item.product.name_en}</p>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#888' }}>Size: {item.size}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateQty(item.product.id, item.size, -1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>-</button>
                      <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, item.size, 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>+</button>
                      <button onClick={() => removeItem(item.product.id, item.size)} style={{ marginLeft: 'auto', color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑</button>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#fda1b7', fontSize: '16px' }}>{item.product.price * item.qty} EGP</p>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Subtotal</span><span style={{ fontWeight: 700 }}>{total} EGP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: freeShipping ? '#27ae60' : '#888' }}>
                <span>Shipping</span><span>{freeShipping ? 'FREE' : '50 EGP'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>
                <span>Total</span><span style={{ color: '#fda1b7' }}>{freeShipping ? total : total + 50} EGP</span>
              </div>
              <Link href="/checkout" style={{
                display: 'block', width: '100%', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #fda1b7, #f78fa3)', color: '#fff',
                textAlign: 'center', textDecoration: 'none', fontWeight: 800, fontSize: '16px'
              }}>
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}