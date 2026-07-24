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
  deposit?: number;
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
  const items = (order.items || []).map(item =>
    `<tr><td>${item.product_name || "منتج"}${item.size && item.size !== "One Size" ? ` (${item.size})` : ""}</td><td style="text-align:left;direction:ltr">x${item.quantity}</td></tr>`
  ).join("");
  return `
    <div class="waybill">
      <div class="wb-top">
        <span>Salma Behery ✦</span>
        <span>#${order.id.slice(-6)} | ${new Date(order.created_at).toLocaleDateString("ar-EG")}</span>
      </div>
      <table>
        <tr><td class="lbl">Name</td><td class="val">${order.customer_name}</td></tr>
        <tr><td class="lbl">Phone</td><td class="val">${order.customer_phone}${order.phone2 ? " / " + order.phone2 : ""}</td></tr>
        <tr><td class="lbl">Address</td><td class="val">${address}</td></tr>
        <tr><td class="lbl">City</td><td class="val">${order.city || "-"}${order.governorate ? " / " + order.governorate : ""}</td></tr>
        ${order.notes ? `<tr><td class="lbl">Notes</td><td class="val">${order.notes}</td></tr>` : ""}
      </table>
      <div class="total-row"><span>Amount Due</span><span>${remaining} EGP</span></div>
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

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${API_BASE}/orders`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();
      const rows: Order[] = Array.isArray(data) ? data : data.orders || [];
      setOrders(rows);
      // Load deposits from DB
      const deps: Record<string, number> = {};
      rows.forEach(o => { if (o.deposit) deps[o.id] = Number(o.deposit); });
      setDeposits(deps);
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
    setDeposits(prev => ({ ...prev, [orderId]: amount }));
    fetch(`${API_BASE}/orders/${orderId}/deposit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deposit: amount }),
    }).catch(() => {});
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
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; direction: rtl; background: #fff; color: #000; padding: 16px; }
    .waybill { border: 2px solid #000; padding: 12px; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
    .wb-top { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    td { padding: 4px 6px; font-size: 12px; vertical-align: top; }
    td.lbl { color: #555; width: 70px; font-size: 11px; }
    td.val { font-weight: bold; }
    .cut { border-top: 2px dashed #000; text-align: center; margin: 16px 0; font-size: 18px; line-height: 0; }
    .cut span { background: #fff; padding: 0 8px; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
    .btns { text-align: center; padding: 20px; }
    .btns button { margin: 0 8px; padding: 12px 32px; font-size: 15px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
    .btn-p { background: #1a1a2e; color: #fff; }
    .btn-d { background: #e91e8c; color: #fff; }
    @media print { .btns { display: none; } }
  `;

  const buildWaybillHtml = (orderList: Order[], titleStr: string) => {
    const pages: string[] = [];
    for (let i = 0; i < orderList.length; i += 4) {
      const group = orderList.slice(i, i + 4);
      const inner = group.map((order, j) =>
        (j > 0 ? `<div class="cut"><span>✂</span></div>` : "") +
        generateWaybillHtml(order, deposits[order.id] || 0, productImages, translatedAddresses[order.id])
      ).join("");
      const isLast = i + 4 >= orderList.length;
      pages.push(`<div style="page-break-after:${isLast ? "auto" : "always"}">${inner}</div>`);
    }
    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${titleStr}</title>
<style>${waybillCss}</style>
</head><body>
${pages.join("")}
<div class="btns">
  <button class="btn-p" onclick="window.print()">🖨️ Print</button>
  <button class="btn-d" onclick="window.print()">📄 Save as PDF</button>
</div>
</body></html>`;
  };

  const doPrint = (orderList: Order[], titleStr: string) => {
    const html = buildWaybillHtml(orderList, titleStr);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handlePrint = (order: Order) => {
    doPrint([order], `Waybill #${order.id.slice(-6)}`);
  };

  const handleBatchPrint = () => {
    const toPrint = orders.filter(o => selectedForPrint.has(o.id));
    if (toPrint.length === 0) return;
    doPrint(toPrint, "Print Waybills");
  };

  const getStatusColor = (s: string) => {
    if (s === "pending") return "#d97706";
    if (s === "processing") return "#2563eb";
    if (s === "partially_shipped") return "#7c3aed";
    if (s === "completed" || s === "delivered") return "#059669";
    if (s === "cancelled") return "#ef4444";
    return "#6b7280";
  };
  const getStatusBg = (s: string) => {
    if (s === "pending") return "#fef3c7";
    if (s === "processing") return "#dbeafe";
    if (s === "partially_shipped") return "#ede9fe";
    if (s === "completed" || s === "delivered") return "#d1fae5";
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
        html, body { margin: 0; overflow-x: hidden; max-width: 100%; }
        body { font-family: 'Segoe UI', sans-serif; background: #f4f3ff; }
        .orders-outer { width: 100%; max-width: 100%; overflow-x: hidden; }
        .orders-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 16px; }
        .orders-table-wrap table { min-width: 900px; }
        .orders-mobile-cards { display: none; }
        @media (max-width: 700px) {
          .orders-outer { padding: 10px !important; }
          .orders-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .orders-header > div:last-child { width: 100%; }
          .orders-header > div:last-child button { width: 100%; }
          .modal-overlay { padding: 12px !important; align-items: center !important; }
          .modal-box { border-radius: 16px !important; max-height: 88vh !important; max-width: 420px !important; }
          .modal-grid { grid-template-columns: 1fr !important; gap: 8px !important; padding: 10px !important; }
          .modal-inner { padding: 0 10px 10px !important; }
          .modal-header { padding: 10px 12px !important; }
          .modal-header h2 { font-size: 14px !important; }
          .modal-header p { font-size: 10px !important; }
          .modal-header > div:last-child { gap: 6px; }
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
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }
        .order-card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 6px;
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
              <Link href="/admin" style={{ color: "#1a1a2e", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Back to Dashboard</Link>
              <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, color: "#111" }}>Orders</h1>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {selectedForPrint.size > 0 && (
                <button onClick={handleBatchPrint} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1a1a2e,#333)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  🖨️ Print / PDF ({selectedForPrint.size})
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
            {/* Select-all bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 14px", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <input type="checkbox"
                checked={selectedForPrint.size === filteredOrders.length && filteredOrders.length > 0}
                onChange={e => {
                  if (e.target.checked) setSelectedForPrint(new Set(filteredOrders.map(o => o.id)));
                  else setSelectedForPrint(new Set());
                }}
                style={{ width: 18, height: 18, accentColor: "#fda1b7", cursor: "pointer" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>
                {selectedForPrint.size > 0 ? `${selectedForPrint.size} selected` : "Select all"}
              </span>
              {selectedForPrint.size > 0 && (
                <button onClick={handleBatchPrint} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  🖨️ Print / PDF ({selectedForPrint.size})
                </button>
              )}
            </div>

            {/* Unified card grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
              {filteredOrders.map(order => {
                const dep = deposits[order.id] || 0;
                const remaining = Math.max(0, (order.total_amount || 0) - dep);
                return (
                  <div key={order.id} style={{ background: "#fff", borderRadius: 12, padding: "10px 12px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 7 }}>
                    {/* Top row: checkbox + order # + status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="checkbox" checked={selectedForPrint.has(order.id)} onChange={() => togglePrint(order.id)}
                        style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#fda1b7", flexShrink: 0 }} />
                      <span style={{ fontWeight: 800, color: "#fda1b7", fontSize: 13, flex: 1 }}>#{order.id.slice(-6)}</span>
                      <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                        style={{ padding: "2px 4px", borderRadius: 5, border: `1px solid ${getStatusColor(order.status)}`, fontSize: 9, background: getStatusBg(order.status), color: getStatusColor(order.status), fontWeight: 700, cursor: "pointer" }}>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="partially_shipped">Part. Shipped</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Customer info */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{order.customer_name}</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>📞 {order.customer_phone}{order.phone2 ? ` · 💬 ${order.phone2}` : ""}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{order.city || ""}{order.governorate ? ` · ${order.governorate}` : ""}</div>
                    </div>

                    {/* Total + deposit */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: 13, color: "#1a1a2e" }}>{fmt(order.total_amount)} EGP</span>
                        {dep > 0 && (
                          <div style={{ marginTop: 2 }}>
                            <div style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>Deposit: {fmt(dep)} EGP</div>
                            <div style={{ fontSize: 10, color: "#d97706", fontWeight: 700 }}>Due: {fmt(remaining)} EGP</div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <input type="number" value={dep === 0 ? "" : dep}
                          onChange={e => saveDeposit(order.id, parseFloat(e.target.value) || 0)}
                          placeholder="Deposit" inputMode="numeric"
                          style={{ width: 70, padding: "4px 6px", borderRadius: 6, border: dep > 0 ? "1.5px solid #059669" : "1.5px solid #eee", fontSize: 11, outline: "none" }} />
                        <span style={{ fontSize: 10, color: "#aaa" }}>EGP</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openOrder(order)}
                        style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        View
                      </button>
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
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setSelectedOrder(null)}>
          <div className="modal-box" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", overflowX: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>

            <div className="modal-header" style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a2e", borderRadius: "16px 16px 0 0" }}>
              <div>
                <h2 style={{ margin: 0, color: "#fff", fontSize: 16, fontWeight: 800 }}>Order #{selectedOrder.id.slice(-6)}</h2>
                <p style={{ margin: "2px 0 0", color: "#fda1b7", fontSize: 11 }}>{new Date(selectedOrder.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: getStatusBg(selectedOrder.status), color: getStatusColor(selectedOrder.status) }}>
                  {selectedOrder.status === "partially_shipped" ? "Part. Shipped" : selectedOrder.status}
                </span>
                <button onClick={() => handlePrint(selectedOrder)}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#fff", color: "#1a1a2e", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>
                  🖨️ Print
                </button>
                <button onClick={() => handlePrint(selectedOrder)}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>
                  📄 PDF
                </button>
                <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            </div>

            <div className="modal-inner modal-grid" style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>

              {/* Customer Info */}
              <div style={{ background: "#fafafa", borderRadius: 10, padding: 12 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: 1 }}>📦 Customer</h3>
                {[
                  ["Name", selectedOrder.customer_name],
                  ["Phone", `📞 ${selectedOrder.customer_phone}`],
                  selectedOrder.phone2 ? ["WhatsApp", `💬 ${selectedOrder.phone2}`] : null,
                  ["Address", selectedOrder.shipping_address || selectedOrder.address || "-"],
                  ["City", selectedOrder.city || "-"],
                  selectedOrder.governorate ? ["Governorate", selectedOrder.governorate] : null,
                  selectedOrder.notes ? ["Notes", selectedOrder.notes] : null,
                ].filter((x): x is string[] => Boolean(x)).map(([label, val], i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #eee" }}>
                    <span style={{ color: "#888", fontSize: 11, minWidth: 70 }}>{label}</span>
                    <span style={{ fontWeight: 600, fontSize: 11, color: label === "WhatsApp" ? "#25d366" : "#1a1a2e" }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Summary + Deposit */}
              <div style={{ background: "#fafafa", borderRadius: 10, padding: 12 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: 1 }}>💰 Summary</h3>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ color: "#888", fontSize: 11 }}>Subtotal</span>
                  <span style={{ fontWeight: 600, fontSize: 11 }}>{fmt((selectedOrder.total_amount || 0) - (selectedOrder.shipping_cost || 0))} EGP</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ color: "#888", fontSize: 11 }}>Shipping</span>
                  <span style={{ fontWeight: 600, fontSize: 11, color: (selectedOrder.shipping_cost || 0) === 0 ? "#22c55e" : "#333" }}>
                    {(selectedOrder.shipping_cost || 0) === 0 ? "FREE 🎉" : `${selectedOrder.shipping_cost} EGP`}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ fontWeight: 800, fontSize: 12 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e" }}>{fmt(selectedOrder.total_amount)} EGP</span>
                </div>

                {/* Deposit */}
                <div style={{ marginTop: 10, padding: 10, background: "#fff", borderRadius: 8, border: "1.5px solid #fda1b7" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#1a1a2e", display: "block", marginBottom: 6 }}>💵 Deposit</label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="number"
                      value={depositInput}
                      onChange={e => setDepositInput(e.target.value)}
                      placeholder="0"
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 13, fontWeight: 700, outline: "none" }}
                    />
                    <span style={{ fontWeight: 600, color: "#888", fontSize: 11 }}>EGP</span>
                    <button onClick={() => { const amt = parseFloat(depositInput) || 0; saveDeposit(selectedOrder.id, amt); }}
                      style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>
                      Save
                    </button>
                  </div>
                  {(deposits[selectedOrder.id] || 0) > 0 && (
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#888" }}>Remaining</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e" }}>
                        {fmt(Math.max(0, (selectedOrder.total_amount || 0) - (deposits[selectedOrder.id] || 0)))} EGP
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 11, color: "#888", fontWeight: 700, display: "block", marginBottom: 6 }}>STATUS</label>
                  <select value={selectedOrder.status} onChange={e => updateStatus(selectedOrder.id, e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${getStatusColor(selectedOrder.status)}`, fontSize: 12, fontWeight: 700, color: getStatusColor(selectedOrder.status), cursor: "pointer", background: getStatusBg(selectedOrder.status), outline: "none" }}>
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
            <div className="modal-inner" style={{ padding: "0 14px 14px" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: 1 }}>🛍️ Items ({selectedOrder.items?.length || 0})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedOrder.items?.map((item, i) => {
                  const img = productImages[item.product_id];
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: 10, background: "#fafafa", borderRadius: 10, alignItems: "center" }}>
                      <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#fdf0f3", border: "1px solid #eee" }}>
                        <img src={img || `https://placehold.co/52x52/fdf0f3/fda1b7?text=💍`} alt={item.product_name || ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/52x52/fdf0f3/fda1b7?text=💍"; }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#1a1a2e" }}>{item.product_name || "Product"}</div>
                        {item.size && item.size !== "One Size" && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Size: {item.size}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: "#888" }}>x{item.quantity}</div>
                        <div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 12 }}>{item.price} EGP</div>
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
