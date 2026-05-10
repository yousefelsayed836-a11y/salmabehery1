"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OrderItem {
  product_id: string;
  product_name?: string;
  product_image?: string;
  quantity: number;
  price: number;
  size?: string;
  total?: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  phone2?: string;
  shipping_address?: string;
  address?: string;
  city?: string;
  governorate?: string;
  total_amount: number;
  shipping_cost?: number;
  status: string;
  created_at: string;
  notes?: string;
  items?: OrderItem[];
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";
const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com";

// ✅ Fetch real product image from API
async function fetchProductImage(productId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/products/${productId}`);
    const data = await res.json();
    const p = data.product || data;
    const img = p.main_image || (p.images && p.images[0]);
    if (!img) return null;
    return img.startsWith("http") ? img : `${BACKEND}${img}`;
  } catch { return null; }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${API_BASE}/orders`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Load product images when order is selected
  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    if (!order.items) return;
    const newImages: Record<string, string> = {};
    await Promise.all(order.items.map(async (item) => {
      if (!productImages[item.product_id]) {
        const img = await fetchProductImage(item.product_id);
        if (img) newImages[item.product_id] = img;
      }
    }));
    setProductImages(prev => ({ ...prev, ...newImages }));
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/orders/${id}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
    } catch {}
  };

  const handlePrint = (order: Order) => {
    const items = order.items || [];
    const address = order.shipping_address || order.address || "";
    const shipping = order.shipping_cost || 0;
    const subtotal = (order.total_amount || 0) - shipping;
    const phone2 = order.phone2 || "";

    const itemsHtml = items.map(item => {
      const img = productImages[item.product_id];
      const imgHtml = img
        ? `<img src="${img}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #eee;" />`
        : `<div style="width:48px;height:48px;border-radius:8px;background:#fdf0f3;display:flex;align-items:center;justify-content:center;font-size:20px;">💍</div>`;
      return `
        <tr>
          <td style="padding:10px 8px;">${imgHtml}</td>
          <td style="padding:10px 8px;font-weight:600;">${item.product_name || "Product"}</td>
          <td style="padding:10px 8px;text-align:center;">${item.size || "-"}</td>
          <td style="padding:10px 8px;text-align:center;font-weight:700;">${item.quantity}</td>
          <td style="padding:10px 8px;text-align:right;">${item.price} EGP</td>
          <td style="padding:10px 8px;text-align:right;font-weight:700;color:#fda1b7;">${(item.total || item.price * item.quantity)} EGP</td>
        </tr>`;
    }).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order #${order.id.slice(-6)}</title>
        <style>
          /* ✅ Full page width, half page height */
          @page {
            size: A4 landscape;
            margin: 10mm 14mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            color: #222;
            font-size: 13px;
            /* Half the page height */
            max-height: 50vh;
            overflow: hidden;
          }
          .wrapper {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            height: 100%;
          }
          .left { display: flex; flex-direction: column; gap: 10px; }
          .right { display: flex; flex-direction: column; }
          .logo { color: #fda1b7; font-size: 22px; font-weight: 800; margin-bottom: 2px; }
          .order-num { font-size: 13px; color: #888; }
          .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #fda1b7; font-weight: 700; border-bottom: 1.5px solid #fda1b7; padding-bottom: 4px; margin-bottom: 8px; }
          .info-row { display: flex; gap: 8px; padding: 3px 0; font-size: 12px; }
          .info-label { color: #888; min-width: 80px; }
          .info-val { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #fda1b7; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
          th:nth-child(3), th:nth-child(4) { text-align: center; }
          th:nth-child(5), th:nth-child(6) { text-align: right; }
          td { border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
          .total-area { margin-top: 8px; border-top: 2px solid #fda1b7; padding-top: 8px; display: flex; justify-content: flex-end; }
          .total-box { min-width: 200px; }
          .total-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
          .total-final { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #fda1b7; padding-top: 6px; margin-top: 4px; border-top: 1px solid #eee; }
          .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; background: ${order.status === "completed" ? "#dcfce7" : order.status === "cancelled" ? "#fee2e2" : "#fef3c7"}; color: ${order.status === "completed" ? "#166534" : order.status === "cancelled" ? "#991b1b" : "#92400e"}; }
          .no-print { display: none; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <!-- LEFT: Customer & Order Info -->
          <div class="left">
            <div>
              <div class="logo">Salma Behery ✦</div>
              <div class="order-num">Order #${order.id.slice(-6)} &nbsp;|&nbsp; ${new Date(order.created_at).toLocaleDateString("en-GB")} &nbsp;|&nbsp; <span class="status-badge">${order.status}</span></div>
            </div>

            <div>
              <div class="section-title">📦 Customer</div>
              <div class="info-row"><span class="info-label">Name:</span><span class="info-val">${order.customer_name}</span></div>
              <div class="info-row"><span class="info-label">📞 Phone:</span><span class="info-val">${order.customer_phone}</span></div>
              ${phone2 ? `<div class="info-row"><span class="info-label">💬 WhatsApp:</span><span class="info-val">${phone2}</span></div>` : ""}
              <div class="info-row"><span class="info-label">📍 Address:</span><span class="info-val">${address}</span></div>
              <div class="info-row"><span class="info-label">🏙️ City:</span><span class="info-val">${order.city || "-"} ${order.governorate ? "/ " + order.governorate : ""}</span></div>
              ${order.notes ? `<div class="info-row"><span class="info-label">📝 Notes:</span><span class="info-val">${order.notes}</span></div>` : ""}
            </div>
          </div>

          <!-- RIGHT: Items Table -->
          <div class="right">
            <div class="section-title">🛍️ Order Items</div>
            <table>
              <thead>
                <tr>
                  <th style="width:52px;">IMG</th>
                  <th>Product</th>
                  <th style="text-align:center;">Size</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Price</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div class="total-area">
              <div class="total-box">
                <div class="total-row"><span>Subtotal:</span><span>${subtotal} EGP</span></div>
                <div class="total-row"><span>Shipping:</span><span style="color:${shipping === 0 ? "#22c55e" : "#666"};">${shipping === 0 ? "FREE 🎉" : shipping + " EGP"}</span></div>
                <div class="total-final"><span>Total:</span><span>${order.total_amount} EGP</span></div>
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 400); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusColor = (s: string) => s === "pending" ? "#f59e0b" : s === "completed" || s === "delivered" ? "#22c55e" : s === "cancelled" ? "#ef4444" : "#6b7280";
  const fmt = (n: number) => (n || 0).toLocaleString();

  return (
    <>
      <style jsx global>{`* { box-sizing: border-box; } body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #f5f5f5; }`}</style>

      <div style={{ minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <Link href="/admin" style={{ color: "#fda1b7", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Back to Dashboard</Link>
              <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>📦 Orders</h1>
            </div>
            <button onClick={fetchOrders} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>🔄 Refresh</button>
          </div>

          {error && <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 12, padding: 16, marginBottom: 24, color: "#ef4444", fontWeight: 600 }}>⚠️ {error}</div>}

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 16, color: "#888" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div><p>No orders found</p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1a1a2e", color: "#fff" }}>
                    {["ORDER", "CUSTOMER", "PHONE", "ADDRESS", "CITY", "ITEMS", "TOTAL", "STATUS", "ACTIONS"].map(h => (
                      <th key={h} style={{ padding: 14, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} style={{ borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fef9fb"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                      {/* ✅ Click row to open order detail */}
                      <td style={{ padding: 14, fontSize: 14, fontWeight: 700, color: "#fda1b7" }} onClick={() => openOrder(order)}>
                        #{order.id.slice(-6)}
                      </td>
                      <td style={{ padding: 14, fontSize: 14 }} onClick={() => openOrder(order)}>{order.customer_name}</td>
                      <td style={{ padding: 14, fontSize: 13 }} onClick={() => openOrder(order)}>
                        <div>📞 {order.customer_phone}</div>
                        {order.phone2 && <div style={{ color: "#25d366", fontSize: 12, marginTop: 2 }}>💬 {order.phone2}</div>}
                      </td>
                      <td style={{ padding: 14, fontSize: 13, maxWidth: 180 }} onClick={() => openOrder(order)}>{order.shipping_address || order.address || "-"}</td>
                      <td style={{ padding: 14, fontSize: 13 }} onClick={() => openOrder(order)}>{order.city || "-"}</td>
                      {/* Items thumbnails */}
                      <td style={{ padding: 8 }} onClick={() => openOrder(order)}>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", maxWidth: 130 }}>
                          {order.items?.slice(0, 4).map((item, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <div style={{ width: 38, height: 38, borderRadius: 8, overflow: "hidden", background: "#fdf0f3", border: "1px solid #eee" }}>
                                <img src={productImages[item.product_id] || `https://placehold.co/38x38/fdf0f3/fda1b7?text=${encodeURIComponent((item.product_name || "?").slice(0, 2))}`}
                                  alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/38x38/fdf0f3/fda1b7?text=💍`; }} />
                              </div>
                              {item.quantity > 1 && <span style={{ position: "absolute", top: -4, right: -4, background: "#1a1a2e", color: "#fff", borderRadius: "50%", width: 15, height: 15, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.quantity}</span>}
                            </div>
                          ))}
                          {(order.items?.length || 0) > 4 && <div style={{ width: 38, height: 38, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#888", fontWeight: 700 }}>+{(order.items?.length || 0) - 4}</div>}
                        </div>
                      </td>
                      <td style={{ padding: 14, fontSize: 14, fontWeight: 700 }} onClick={() => openOrder(order)}>{fmt(order.total_amount)} EGP</td>
                      <td style={{ padding: 14 }}>
                        <select value={order.status} onChange={e => { e.stopPropagation(); updateStatus(order.id, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 12, background: "#fff", color: getStatusColor(order.status), fontWeight: 700, cursor: "pointer" }}>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td style={{ padding: 14, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={e => { e.stopPropagation(); openOrder(order); }}
                            style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            👁️ View
                          </button>
                          <button onClick={e => { e.stopPropagation(); openOrder(order).then(() => handlePrint(order)); }}
                            style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            🖨️ Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Order Detail Modal */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSelectedOrder(null)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ padding: "20px 28px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a2e", borderRadius: "20px 20px 0 0" }}>
              <div>
                <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 800 }}>Order #{selectedOrder.id.slice(-6)}</h2>
                <p style={{ margin: "4px 0 0", color: "#fda1b7", fontSize: 13 }}>{new Date(selectedOrder.created_at).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: selectedOrder.status === "completed" ? "#dcfce7" : selectedOrder.status === "cancelled" ? "#fee2e2" : "#fef3c7", color: getStatusColor(selectedOrder.status) }}>
                  {selectedOrder.status}
                </span>
                <button onClick={() => handlePrint(selectedOrder)}
                  style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  🖨️ Print
                </button>
                <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            </div>

            <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

              {/* Customer Info */}
              <div style={{ background: "#fafafa", borderRadius: 14, padding: 20 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#fda1b7", textTransform: "uppercase", letterSpacing: 1 }}>📦 Customer</h3>
                {[
                  ["Name", selectedOrder.customer_name],
                  ["Phone", `📞 ${selectedOrder.customer_phone}`],
                  selectedOrder.phone2 ? ["WhatsApp", `💬 ${selectedOrder.phone2}`] : null,
                  ["Address", selectedOrder.shipping_address || selectedOrder.address || "-"],
                  ["City", selectedOrder.city || "-"],
                  selectedOrder.governorate ? ["Governorate", selectedOrder.governorate] : null,
                  selectedOrder.notes ? ["Notes", selectedOrder.notes] : null,
                ].filter((x): x is string[] => Boolean(x)).map(([label, val], i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #eee" }}>
                    <span style={{ color: "#888", fontSize: 13, minWidth: 90 }}>{label}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: label === "WhatsApp" ? "#25d366" : "#1a1a2e" }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div style={{ background: "#fafafa", borderRadius: 14, padding: 20 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#fda1b7", textTransform: "uppercase", letterSpacing: 1 }}>💰 Summary</h3>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ color: "#888", fontSize: 13 }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{fmt((selectedOrder.total_amount || 0) - (selectedOrder.shipping_cost || 0))} EGP</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ color: "#888", fontSize: 13 }}>Shipping</span>
                  <span style={{ fontWeight: 600, color: (selectedOrder.shipping_cost || 0) === 0 ? "#22c55e" : "#333" }}>
                    {(selectedOrder.shipping_cost || 0) === 0 ? "FREE 🎉" : `${selectedOrder.shipping_cost} EGP`}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 20, color: "#fda1b7" }}>{fmt(selectedOrder.total_amount)} EGP</span>
                </div>

                {/* Status Change */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #eee" }}>
                  <label style={{ fontSize: 12, color: "#888", fontWeight: 700, display: "block", marginBottom: 8 }}>UPDATE STATUS</label>
                  <select value={selectedOrder.status} onChange={e => updateStatus(selectedOrder.id, e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #f0d4dc", fontSize: 14, fontWeight: 700, color: getStatusColor(selectedOrder.status), cursor: "pointer", background: "#fff", outline: "none" }}>
                    <option value="pending">⏳ Pending</option>
                    <option value="processing">🔄 Processing</option>
                    <option value="completed">✅ Completed</option>
                    <option value="cancelled">❌ Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Items */}
            <div style={{ padding: "0 28px 28px" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#fda1b7", textTransform: "uppercase", letterSpacing: 1 }}>🛍️ Items ({selectedOrder.items?.length || 0})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {selectedOrder.items?.map((item, i) => {
                  const img = productImages[item.product_id];
                  return (
                    <div key={i} style={{ display: "flex", gap: 14, padding: 14, background: "#fafafa", borderRadius: 12, alignItems: "center" }}>
                      <div style={{ width: 70, height: 70, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#fdf0f3", border: "1px solid #eee" }}>
                        <img src={img || `https://placehold.co/70x70/fdf0f3/fda1b7?text=💍`} alt={item.product_name || ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/70x70/fdf0f3/fda1b7?text=💍"; }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{item.product_name || "Product"}</div>
                        {item.size && <div style={{ fontSize: 13, color: "#888", marginTop: 3 }}>Size: {item.size}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 13, color: "#888" }}>x{item.quantity}</div>
                        <div style={{ fontWeight: 700, color: "#fda1b7", fontSize: 15 }}>{item.price} EGP</div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>{item.total || item.price * item.quantity} EGP total</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
