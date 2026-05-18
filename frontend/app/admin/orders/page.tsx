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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";
const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com";

const isArabic = (text: string) => /[؀-ۿ]/.test(text);

async function translateToArabic(text: string): Promise<string> {
  if (!text || text === "-" || isArabic(text)) return text;
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && translated !== text) return translated;
    return text;
  } catch { return text; }
}

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

function generateWaybillHtml(order: Order, deposit: number, productImages: Record<string, string>, translatedAddr?: string): string {
  const remaining = Math.max(0, (order.total_amount || 0) - deposit);
  const address = translatedAddr || order.shipping_address || order.address || "-";
  const shipping = order.shipping_cost || 0;

  return `
    <div class="waybill">
      <div class="wb-top">
        <div class="wb-logo">Salma Behery ✦</div>
        <div class="wb-order">#${order.id.slice(-6)} &nbsp;|&nbsp; ${new Date(order.created_at).toLocaleDateString("ar-EG")}</div>
      </div>
      <div class="wb-grid">
        <div class="wb-col">
          <div class="wb-row"><span class="wb-label">الاسم</span><span class="wb-val">${order.customer_name}</span></div>
          <div class="wb-row"><span class="wb-label">التليفون</span><span class="wb-val">${order.customer_phone}${order.phone2 ? " / " + order.phone2 : ""}</span></div>
          <div class="wb-row"><span class="wb-label">العنوان</span><span class="wb-val">${address}</span></div>
          <div class="wb-row"><span class="wb-label">المدينة</span><span class="wb-val">${order.city || "-"}${order.governorate ? " / " + order.governorate : ""}</span></div>
          ${order.notes ? `<div class="wb-row"><span class="wb-label">ملاحظات</span><span class="wb-val">${order.notes}</span></div>` : ""}
        </div>
        <div class="wb-col">
          <div class="wb-items-title">المنتجات</div>
          ${(order.items || []).map(item => `
            <div class="wb-item">
              <span class="wb-item-name">${item.product_name || "منتج"}</span>
              ${item.size ? `<span class="wb-item-size">مقاس: ${item.size}</span>` : ""}
              <span class="wb-item-qty">x${item.quantity}</span>
            </div>`).join("")}
          <div class="wb-totals">
            <div class="wb-total-row"><span>الشحن</span><span>${shipping === 0 ? "مجاني 🎉" : shipping + " ج.م"}</span></div>
            <div class="wb-total-row"><span>الإجمالي</span><span>${order.total_amount} ج.م</span></div>
            ${deposit > 0 ? `<div class="wb-total-row"><span>مدفوع مقدم</span><span>${deposit} ج.م</span></div>` : ""}
            <div class="wb-total-final"><span>المتبقي للتحصيل</span><span>${remaining} ج.م</span></div>
          </div>
        </div>
      </div>
    </div>`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [deposits, setDeposits] = useState<Record<string, number>>({});
  const [depositInput, setDepositInput] = useState<string>("");
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [translatedAddresses, setTranslatedAddresses] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Disable pinch-zoom on admin orders page (mobile dashboard)
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    const original = meta?.getAttribute("content") || "";
    if (meta) meta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
    return () => { if (meta && original) meta.setAttribute("content", original); };
  }, []);

  useEffect(() => {
    fetchOrders();
    const saved: Record<string, number> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("deposit_")) {
        const id = key.replace("deposit_", "");
        saved[id] = parseFloat(localStorage.getItem(key) || "0") || 0;
      }
    }
    setDeposits(saved);
  }, []);

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

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setDepositInput(String(deposits[order.id] || ""));
    const rawAddress = order.shipping_address || order.address || "";
    // Auto-translate address to Arabic if not already Arabic
    if (rawAddress && !translatedAddresses[order.id]) {
      translateToArabic(rawAddress).then(translated => {
        setTranslatedAddresses(prev => ({ ...prev, [order.id]: translated }));
      });
    }
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

  const saveDeposit = (orderId: string, amount: number) => {
    localStorage.setItem(`deposit_${orderId}`, String(amount));
    setDeposits(prev => ({ ...prev, [orderId]: amount }));
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

  const togglePrint = (orderId: string) => {
    setSelectedForPrint(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const waybillCss = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    @page {
      size: A4 portrait;
      margin: 5mm 8mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Cairo', Arial, sans-serif;
      direction: rtl;
      color: #1a1a2e;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #fff;
    }

    /* === PAGE WRAPPER: always 1 page === */
    .page-pair {
      display: flex;
      flex-direction: column;
      gap: 7mm;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .page-pair:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    /* === WAYBILL: 2 fit in 80% of A4 page === */
    .waybill {
      width: 100%;
      height: 111mm;
      border: 1.5px solid #000;
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #fff;
    }

    /* Dashed cut line between the two waybills */
    .cut-line {
      height: 0;
      border-top: 1.5px dashed #000;
      text-align: center;
      position: relative;
      flex-shrink: 0;
    }
    .cut-line::before {
      content: '✂';
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 6px;
      font-size: 13px;
      color: #000;
    }

    .wb-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 5px; margin-bottom: 4px; }
    .wb-logo { font-size: 16px; font-weight: 800; color: #000; }
    .wb-order { font-size: 11px; color: #555; }
    .wb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1; min-height: 0; }
    .wb-col { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
    .wb-row { display: flex; gap: 6px; font-size: 11px; padding: 2px 0; border-bottom: 1px solid #ddd; }
    .wb-label { color: #555; min-width: 58px; font-size: 10px; flex-shrink: 0; }
    .wb-val { font-weight: 700; flex: 1; font-size: 11px; word-break: break-word; color: #000; }
    .wb-items-title { font-size: 10px; color: #000; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 2px; }
    .wb-item { display: flex; gap: 5px; font-size: 10px; padding: 2px 0; border-bottom: 1px dotted #ccc; }
    .wb-item-name { flex: 1; font-weight: 600; color: #000; }
    .wb-item-size { color: #555; }
    .wb-item-qty { color: #000; font-weight: 700; direction: ltr; unicode-bidi: embed; }
    .wb-totals { margin-top: auto; border-top: 1.5px solid #000; padding-top: 4px; }
    .wb-total-row { display: flex; justify-content: space-between; font-size: 10px; padding: 1px 0; color: #555; }
    .wb-total-final { display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; color: #000; margin-top: 3px; border-top: 1px solid #999; padding-top: 3px; }
  `;

  const handlePrint = (order: Order) => {
    const deposit = deposits[order.id] || 0;
    const addr = translatedAddresses[order.id];
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const body = `<div class="page-pair">${generateWaybillHtml(order, deposit, productImages, addr)}</div>`;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>بوليصة #${order.id.slice(-6)}</title><style>${waybillCss}</style></head><body>${body}<script>window.onload=function(){setTimeout(function(){window.print();},600);}<\/script></body></html>`);
    printWindow.document.close();
  };

  const handleBatchPrint = () => {
    const toPrint = orders.filter(o => selectedForPrint.has(o.id));
    if (toPrint.length === 0) return;
    const pages: string[] = [];
    for (let i = 0; i < toPrint.length; i += 2) {
      const a = generateWaybillHtml(toPrint[i], deposits[toPrint[i].id] || 0, productImages, translatedAddresses[toPrint[i].id]);
      const cutOrEmpty = i + 1 < toPrint.length
        ? `<div class="cut-line"></div>`
        : `<div style="height:140mm"></div>`;
      const b = i + 1 < toPrint.length
        ? generateWaybillHtml(toPrint[i + 1], deposits[toPrint[i + 1].id] || 0, productImages, translatedAddresses[toPrint[i + 1].id])
        : "";
      pages.push(`<div class="page-pair">${a}${cutOrEmpty}${b}</div>`);
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>طباعة بوليصات</title><style>${waybillCss}</style></head><body>${pages.join("")}<script>window.onload=function(){setTimeout(function(){window.print();},800);}<\/script></body></html>`);
    printWindow.document.close();
  };

  const getStatusColor = (s: string) => {
    if (s === "pending") return "#f59e0b";
    if (s === "processing") return "#3b82f6";
    if (s === "partially_shipped") return "#8b5cf6";
    if (s === "completed" || s === "delivered") return "#22c55e";
    if (s === "cancelled") return "#ef4444";
    return "#6b7280";
  };
  const getStatusBg = (s: string) => {
    if (s === "pending") return "#fef3c7";
    if (s === "processing") return "#dbeafe";
    if (s === "partially_shipped") return "#ede9fe";
    if (s === "completed" || s === "delivered") return "#dcfce7";
    if (s === "cancelled") return "#fee2e2";
    return "#f3f4f6";
  };
  const fmt = (n: number) => (n || 0).toLocaleString();

  const filteredOrders = searchQuery.trim()
    ? orders.filter(o => {
        const q = searchQuery.trim().toLowerCase();
        return (
          o.id.slice(-6).toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q) ||
          (o.phone2 || "").includes(q) ||
          (o.shipping_address || o.address || "").toLowerCase().includes(q)
        );
      })
    : orders;

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #f5f5f5; }
        .orders-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 16px; }
        .orders-table-wrap table { min-width: 900px; }
        .orders-mobile-cards { display: none; }
        @media (max-width: 700px) {
          .orders-outer { padding: 10px !important; }
          .orders-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .modal-grid { grid-template-columns: 1fr !important; }
          .modal-inner { padding: 14px !important; }
          .modal-header { padding: 14px 16px !important; flex-wrap: wrap !important; gap: 8px !important; }
          .orders-table-wrap { display: none; }
          .orders-mobile-cards { display: flex; flex-direction: column; gap: 12px; }
          input, select, textarea { font-size: 16px !important; }
          .orders-mobile-select-bar { display: flex !important; }
        }
        .orders-mobile-select-bar { display: none; align-items: center; gap: 10px; margin-bottom: 10px; }
        .order-card {
          background: #fff;
          border-radius: 14px;
          padding: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          border: 1px solid #f0d4dc;
        }
        .order-card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .order-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .order-card-actions button, .order-card-actions select {
          flex: 1;
          min-width: 0;
          padding: 9px 10px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>

      <div className="orders-outer" style={{ minHeight: "100vh", padding: 16 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* Header */}
          <div className="orders-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <Link href="/admin" style={{ color: "#fda1b7", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Back to Dashboard</Link>
              <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>📦 Orders</h1>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {selectedForPrint.size > 0 && (
                <button onClick={handleBatchPrint} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1a1a2e,#333)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  🖨️ Print {selectedForPrint.size} Waybill{selectedForPrint.size > 1 ? "s" : ""}
                </button>
              )}
              <button onClick={fetchOrders} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>🔄 Refresh</button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 Search by order #, name, phone, or address..."
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1.5px solid #eee",
                fontSize: 14,
                outline: "none",
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                fontFamily: "inherit",
                direction: "rtl",
              }}
              onFocus={e => (e.target.style.borderColor = "#fda1b7")}
              onBlur={e => (e.target.style.borderColor = "#eee")}
            />
            {searchQuery && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#888", textAlign: "right" }}>
                {filteredOrders.length} results of {orders.length}
              </div>
            )}
          </div>

          {error && <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 12, padding: 16, marginBottom: 24, color: "#ef4444", fontWeight: 600 }}>⚠️ {error}</div>}

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 16, color: "#888" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div><p>{searchQuery ? "No results found" : "No orders found"}</p>
            </div>
          ) : (
            <>
            <div className="orders-table-wrap" style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1a1a2e", color: "#fff" }}>
                    <th style={{ padding: 14, width: 40 }}>
                      <input type="checkbox" onChange={e => {
                        if (e.target.checked) setSelectedForPrint(new Set(filteredOrders.map(o => o.id)));
                        else setSelectedForPrint(new Set());
                      }} checked={selectedForPrint.size === filteredOrders.length && filteredOrders.length > 0} />
                    </th>
                    {["ORDER", "CUSTOMER", "PHONE", "ADDRESS", "CITY", "ITEMS", "TOTAL", "DEPOSIT", "STATUS", "ACTIONS"].map(h => (
                      <th key={h} style={{ padding: 14, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const dep = deposits[order.id] || 0;
                    const remaining = Math.max(0, (order.total_amount || 0) - dep);
                    return (
                      <tr key={order.id} style={{ borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}>
                        <td style={{ padding: "0 14px" }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedForPrint.has(order.id)} onChange={() => togglePrint(order.id)} />
                        </td>
                        <td style={{ padding: 14, fontSize: 14, fontWeight: 700, color: "#fda1b7" }} onClick={() => openOrder(order)}>
                          #{order.id.slice(-6)}
                        </td>
                        <td style={{ padding: 14, fontSize: 14 }} onClick={() => openOrder(order)}>{order.customer_name}</td>
                        <td style={{ padding: 14, fontSize: 13 }} onClick={() => openOrder(order)}>
                          <div>📞 {order.customer_phone}</div>
                          {order.phone2 && <div style={{ color: "#25d366", fontSize: 12, marginTop: 2 }}>💬 {order.phone2}</div>}
                        </td>
                        <td style={{ padding: 14, fontSize: 13, maxWidth: 160 }} onClick={() => openOrder(order)}>{order.shipping_address || order.address || "-"}</td>
                        <td style={{ padding: 14, fontSize: 13 }} onClick={() => openOrder(order)}>{order.city || "-"}</td>
                        <td style={{ padding: 8 }} onClick={() => openOrder(order)}>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", maxWidth: 120 }}>
                            {order.items?.slice(0, 4).map((item, i) => (
                              <div key={i} style={{ position: "relative" }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "#fdf0f3", border: "1px solid #eee" }}>
                                  <img src={productImages[item.product_id] || `https://placehold.co/36x36/fdf0f3/fda1b7?text=💍`}
                                    alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/36x36/fdf0f3/fda1b7?text=💍`; }} />
                                </div>
                                {item.quantity > 1 && <span style={{ position: "absolute", top: -4, right: -4, background: "#1a1a2e", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.quantity}</span>}
                              </div>
                            ))}
                            {(order.items?.length || 0) > 4 && <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#888", fontWeight: 700 }}>+{(order.items?.length || 0) - 4}</div>}
                          </div>
                        </td>
                        <td style={{ padding: 14, fontSize: 14, fontWeight: 700 }} onClick={() => openOrder(order)}>
                          <div>{fmt(order.total_amount)} EGP</div>
                          {dep > 0 && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>Remaining: {fmt(remaining)}</div>}
                        </td>
                        <td style={{ padding: 8 }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="number"
                              value={dep === 0 ? "" : dep}
                              onChange={e => saveDeposit(order.id, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              style={{ width: 72, padding: "5px 8px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 12, outline: "none" }}
                            />
                            <span style={{ fontSize: 11, color: "#888" }}>EGP</span>
                          </div>
                        </td>
                        <td style={{ padding: 14 }}>
                          <select value={order.status} onChange={e => { e.stopPropagation(); updateStatus(order.id, e.target.value); }}
                            onClick={e => e.stopPropagation()}
                            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 12, background: "#fff", color: getStatusColor(order.status), fontWeight: 700, cursor: "pointer" }}>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="partially_shipped">Partially Shipped</option>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile select-all bar */}
            <div className="orders-mobile-select-bar">
              <input type="checkbox"
                checked={selectedForPrint.size === filteredOrders.length && filteredOrders.length > 0}
                onChange={e => {
                  if (e.target.checked) setSelectedForPrint(new Set(filteredOrders.map(o => o.id)));
                  else setSelectedForPrint(new Set());
                }}
                style={{ width: 18, height: 18, accentColor: "#fda1b7" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>
                {selectedForPrint.size > 0 ? `${selectedForPrint.size} selected` : "Select all"}
              </span>
              {selectedForPrint.size > 0 && (
                <button onClick={handleBatchPrint} style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  🖨️ Print {selectedForPrint.size}
                </button>
              )}
            </div>

            {/* Mobile card view */}
            <div className="orders-mobile-cards">
              {filteredOrders.map(order => {
                const dep = deposits[order.id] || 0;
                const remaining = Math.max(0, (order.total_amount || 0) - dep);
                return (
                  <div key={order.id} className="order-card">
                    <div className="order-card-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={selectedForPrint.has(order.id)} onChange={() => togglePrint(order.id)}
                          style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#fda1b7" }} />
                        <span style={{ fontWeight: 800, color: "#fda1b7", fontSize: 16 }}>#{order.id.slice(-6)}</span>
                      </div>
                      <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                        style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #ddd", fontSize: 12, background: "#fff", color: getStatusColor(order.status), fontWeight: 700, cursor: "pointer" }}>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="partially_shipped">Part. Shipped</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 2 }}>{order.customer_name}</div>
                    <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>📞 {order.customer_phone}</div>
                    {order.phone2 && <div style={{ fontSize: 12, color: "#25d366", marginBottom: 2 }}>💬 {order.phone2}</div>}
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{order.city || ""}{order.governorate ? ` · ${order.governorate}` : ""}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e" }}>{fmt(order.total_amount)} EGP</span>
                      {dep > 0 && <span style={{ fontSize: 12, color: "#22c55e" }}>Remaining: {fmt(remaining)}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                      <input type="number" value={dep === 0 ? "" : dep}
                        onChange={e => saveDeposit(order.id, parseFloat(e.target.value) || 0)}
                        placeholder="Deposit (EGP)" inputMode="numeric"
                        style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 16, outline: "none" }} />
                    </div>
                    <div className="order-card-actions">
                      <button onClick={() => openOrder(order)} style={{ background: "#1a1a2e", color: "#fff" }}>👁️ View</button>
                      <button onClick={() => openOrder(order).then(() => handlePrint(order))} style={{ background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff" }}>🖨️ Print</button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSelectedOrder(null)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>

            <div className="modal-header" style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a2e", borderRadius: "20px 20px 0 0" }}>
              <div>
                <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 800 }}>Order #{selectedOrder.id.slice(-6)}</h2>
                <p style={{ margin: "4px 0 0", color: "#fda1b7", fontSize: 13 }}>{new Date(selectedOrder.created_at).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: getStatusBg(selectedOrder.status), color: getStatusColor(selectedOrder.status) }}>
                  {selectedOrder.status === "partially_shipped" ? "Partially Shipped" : selectedOrder.status}
                </span>
                <button onClick={() => handlePrint(selectedOrder)}
                  style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  🖨️ Print Waybill
                </button>
                <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            </div>

            <div className="modal-inner modal-grid" style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

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

              {/* Summary + Deposit */}
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
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: "#fda1b7" }}>{fmt(selectedOrder.total_amount)} EGP</span>
                </div>

                {/* Deposit */}
                <div style={{ marginTop: 14, padding: 14, background: "#fff", borderRadius: 10, border: "1.5px solid #fda1b7" }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", display: "block", marginBottom: 8 }}>💵 Deposit (Paid in advance)</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="number"
                      value={depositInput}
                      onChange={e => setDepositInput(e.target.value)}
                      placeholder="0"
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 15, fontWeight: 700, outline: "none" }}
                    />
                    <span style={{ fontWeight: 600, color: "#888" }}>EGP</span>
                    <button onClick={() => { const amt = parseFloat(depositInput) || 0; saveDeposit(selectedOrder.id, amt); }}
                      style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                      Save
                    </button>
                  </div>
                  {(deposits[selectedOrder.id] || 0) > 0 && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span style={{ color: "#888" }}>Remaining to collect</span>
                      <span style={{ fontWeight: 800, fontSize: 18, color: "#22c55e" }}>
                        {fmt(Math.max(0, (selectedOrder.total_amount || 0) - (deposits[selectedOrder.id] || 0)))} EGP
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, color: "#888", fontWeight: 700, display: "block", marginBottom: 8 }}>UPDATE STATUS</label>
                  <select value={selectedOrder.status} onChange={e => updateStatus(selectedOrder.id, e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #f0d4dc", fontSize: 14, fontWeight: 700, color: getStatusColor(selectedOrder.status), cursor: "pointer", background: "#fff", outline: "none" }}>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="partially_shipped">Partially Shipped</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="modal-inner" style={{ padding: "0 20px 20px" }}>
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
