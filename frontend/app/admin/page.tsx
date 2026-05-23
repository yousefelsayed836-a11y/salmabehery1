"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Order {
  id: string;
  total_amount: number;
  shipping_cost?: number;
  status: string;
  created_at: string;
  customer_name?: string;
}

interface Product {
  id: string;
  name_en: string;
  price: number;
  stock: number;
  is_active: boolean;
  images?: string | string[];
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";

const getAdminPw = () => (typeof window !== "undefined" ? localStorage.getItem("admin_pw") || "1122" : "1122");

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("admin_auth") === "1";
    return false;
  });
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwForm, setChangePwForm] = useState({ current: "", next: "", confirm: "" });
  const [changePwMsg, setChangePwMsg] = useState("");
  const [newOrderToast, setNewOrderToast] = useState<{ name: string; total: number } | null>(null);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconMsg, setFaviconMsg] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroMsg, setHeroMsg] = useState("");
  const [fbPixelId, setFbPixelId] = useState("");
  const [fbPixelMsg, setFbPixelMsg] = useState("");
  const [featuredTitle, setFeaturedTitle] = useState("Featured Products");
  const [featuredEnabled, setFeaturedEnabled] = useState(false);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [featuredMsg, setFeaturedMsg] = useState("");
  const [featuredSearch, setFeaturedSearch] = useState("");

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    fetch(`${API_BASE}/settings/favicon`)
      .then(r => r.json())
      .then(d => { if (d.value) setFaviconUrl(d.value); })
      .catch(() => {});
    fetch(`${API_BASE}/settings/hero_image`)
      .then(r => r.json())
      .then(d => { if (d.value) setHeroUrl(d.value); })
      .catch(() => {});
    fetch(`${API_BASE}/settings/fb_pixel_id`)
      .then(r => r.json())
      .then(d => { if (d.value) setFbPixelId(d.value); })
      .catch(() => {});
    fetch(`${API_BASE}/settings/featured_section`)
      .then(r => r.json())
      .then(d => {
        if (d.value) {
          try {
            const parsed = JSON.parse(d.value);
            setFeaturedTitle(parsed.title || "Featured Products");
            setFeaturedEnabled(parsed.enabled || false);
            setFeaturedIds(parsed.product_ids || []);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const uploadFavicon = async (file: File) => {
    setFaviconUploading(true);
    setFaviconMsg("");
    try {
      const form = new FormData();
      form.append("image", file);
      const up = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
      if (!up.ok) throw new Error(`Upload error ${up.status}`);
      const { url } = await up.json();
      await fetch(`${API_BASE}/settings/favicon`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: url }),
      });
      setFaviconUrl(url);
      setFaviconMsg("✅ Favicon updated!");
      let link = document.getElementById("dynamic-favicon") as HTMLLinkElement | null;
      if (!link) { link = document.createElement("link"); link.id = "dynamic-favicon"; link.rel = "icon"; document.head.appendChild(link); }
      link.href = url + "?t=" + Date.now();
    } catch (e: any) { setFaviconMsg("❌ " + e.message); }
    setFaviconUploading(false);
    setTimeout(() => setFaviconMsg(""), 4000);
  };

  const uploadHero = async (file: File) => {
    setHeroUploading(true);
    setHeroMsg("");
    try {
      const form = new FormData();
      form.append("image", file);
      const up = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
      if (!up.ok) throw new Error(`Upload error ${up.status}`);
      const { url } = await up.json();
      await fetch(`${API_BASE}/settings/hero_image`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: url }),
      });
      setHeroUrl(url);
      setHeroMsg("✅ Hero image updated!");
    } catch (e: any) { setHeroMsg("❌ " + e.message); }
    setHeroUploading(false);
    setTimeout(() => setHeroMsg(""), 4000);
  };

  // SSE: listen for new orders
  useEffect(() => {
    if (!authed) return;
    const es = new EventSource(`${API_BASE.replace("/api", "")}/api/events`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "new_order") {
          setNewOrderToast({ name: data.order.customer_name, total: data.order.total_amount });
          fetchData();
          // Browser notification
          if (Notification.permission === "granted") {
            new Notification("🛍️ New Order!", { body: `${data.order.customer_name} — ${data.order.total_amount} EGP`, icon: "/favicon.png" });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(p => {
              if (p === "granted") new Notification("🛍️ New Order!", { body: `${data.order.customer_name} — ${data.order.total_amount} EGP` });
            });
          }
          setTimeout(() => setNewOrderToast(null), 6000);
        }
      } catch {}
    };
    return () => es.close();
  }, [authed]);

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/orders`, { headers: { Accept: "application/json" } }),
        fetch(`${API_BASE}/products?limit=1000`, { headers: { Accept: "application/json" } }),
      ]);
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      setOrders(Array.isArray(ordersData) ? ordersData : ordersData.orders || []);
      setProducts(Array.isArray(productsData) ? productsData : productsData.products || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalOrders = orders.length;

  // ✅ Revenue = confirmed/completed orders ONLY
  const confirmedOrders = orders.filter(o =>
    ["completed", "delivered", "confirmed"].includes((o.status || "").toLowerCase())
  );
  const totalRevenue = confirmedOrders.reduce((s, o) => s + (parseFloat(String(o.total_amount)) || 0), 0);
  const allRevenue = totalRevenue; // same — only confirmed

  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5).length;
  const outOfStock = products.filter(p => (p.stock || 0) === 0).length;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (!authed) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#1a1a2e", letterSpacing: -0.5 }}>Salma Behery</h1>
        <p style={{ margin: "0 0 32px", fontSize: 13, color: "#aaa" }}>Dashboard</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password" value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => { if (e.key === "Enter") { if (pw === getAdminPw()) { sessionStorage.setItem("admin_auth", "1"); setAuthed(true); } else setPwError(true); } }}
            placeholder="Password"
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${pwError ? "#ef4444" : "#e5e7eb"}`, fontSize: 15, outline: "none", boxSizing: "border-box", color: "#1a1a2e", background: "#fafafa" }}
          />
          {pwError && <p style={{ margin: 0, fontSize: 13, color: "#ef4444" }}>كلمة المرور غلط</p>}
          <button
            onClick={() => { if (pw === getAdminPw()) { sessionStorage.setItem("admin_auth", "1"); setAuthed(true); } else setPwError(true); }}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#1a1a2e", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5 }}>
            دخول
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 18, color: "#888" }}>Loading dashboard...</div>
    </div>
  );

  // Analytics: orders per day last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en", { weekday: "short" });
    const count = orders.filter(o => (o.created_at || "").slice(0, 10) === key).length;
    const rev = orders.filter(o => (o.created_at || "").slice(0, 10) === key && ["completed","delivered","confirmed"].includes(o.status || "")).reduce((s, o) => s + (parseFloat(String(o.total_amount)) || 0), 0);
    return { label, count, rev };
  });
  const maxCount = Math.max(...last7.map(d => d.count), 1);
  const maxRev = Math.max(...last7.map(d => d.rev), 1);

  // SVG line chart points
  const W = 320, H = 80, pad = 10;
  const pts = (arr: number[], max: number) => arr.map((v, i) => {
    const x = pad + (i / (arr.length - 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const countPts = pts(last7.map(d => d.count), maxCount);
  const revPts   = pts(last7.map(d => d.rev),   maxRev);

  // Status breakdown
  const statusMap: Record<string, number> = {};
  orders.forEach(o => { const s = o.status || "pending"; statusMap[s] = (statusMap[s] || 0) + 1; });
  const statusColors: Record<string, string> = { pending: "#f59e0b", confirmed: "#1a1a2e", completed: "#10b981", delivered: "#10b981", cancelled: "#ef4444", shipped: "#3b82f6" };

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #f4f3ff; }
        input, select, textarea { font-size: 16px !important; }
        .dash-card { background: #fff; border-radius: 20px; box-shadow: 0 2px 16px rgba(0,0,0,0.07); }
        @media (max-width: 640px) {
          .dash-wrap { padding: 14px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .nav-grid   { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .chart-row  { flex-direction: column !important; }
          .pw-grid    { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="dash-wrap" style={{ minHeight: "100vh", padding: "20px 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* ── Top bar ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: -0.3 }}>Dashboard</h1>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "#9ca3af" }}>{new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <Link href="/admin/orders" style={{ padding: "10px 18px", borderRadius: 12, background: "#1a1a2e", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              View Orders
            </Link>
          </div>

          {/* ── Stats ── */}
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Total Revenue", value: `${fmt(totalRevenue)} EGP`, sub: "confirmed orders", color: "#1a1a2e", bg: "#f0eeff" },
              { label: "Total Orders",  value: totalOrders,                sub: `${pendingOrders} pending`,   color: "#f59e0b", bg: "#fffbeb" },
              { label: "Products",      value: totalProducts,              sub: `${activeProducts} active`,   color: "#10b981", bg: "#ecfdf5" },
              { label: "Low Stock",     value: lowStock,                   sub: `${outOfStock} out of stock`, color: "#ef4444", bg: "#fef2f2" },
            ].map(s => (
              <div key={s.label} className="dash-card" style={{ padding: "20px 18px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</p>
                <p style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#111" }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: s.color, fontWeight: 600 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Charts ── */}
          <div className="chart-row" style={{ display: "flex", gap: 14, marginBottom: 20 }}>

            {/* Orders over time */}
            <div className="dash-card" style={{ flex: 2, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>Orders — Last 7 Days</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>{orders.length} total orders</p>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 24, height: 2, background: "#1a1a2e", display: "inline-block", borderRadius: 2 }} />Orders</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 24, height: 2, background: "#10b981", display: "inline-block", borderRadius: 2 }} />Revenue</span>
                </div>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 90 }}>
                <polyline points={revPts}   fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={countPts} fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {last7.map((d, i) => {
                  const x = pad + (i / (last7.length - 1)) * (W - pad * 2);
                  const y = H - pad - (d.count / maxCount) * (H - pad * 2);
                  return <circle key={i} cx={x} cy={y} r="3" fill="#1a1a2e" />;
                })}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                {last7.map((d, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>{d.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: "#111" }}>{d.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order status breakdown */}
            <div className="dash-card" style={{ flex: 1, padding: 22 }}>
              <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#111" }}>Order Status</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(statusMap).sort((a,b) => b[1]-a[1]).map(([status, count]) => {
                  const pct = Math.round((count / totalOrders) * 100);
                  const color = statusColors[status] || "#9ca3af";
                  return (
                    <div key={status}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#111", textTransform: "capitalize" }}>{status}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{count} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#f3f4f6" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: color, width: `${pct}%`, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(statusMap).length === 0 && <p style={{ color: "#9ca3af", fontSize: 13 }}>No orders yet</p>}
              </div>
            </div>
          </div>

          {/* ── Nav Cards ── */}
          <div className="nav-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { href: "/admin/orders",     label: "Orders",     sub: `${totalOrders} orders`,     bg: "linear-gradient(135deg,#1a1a2e,#2d2d4e)" },
              { href: "/admin/product",    label: "Products",   sub: `${totalProducts} products`,  bg: "linear-gradient(135deg,#1e1b4b,#3730a3)" },
              { href: "/admin/shipping",   label: "Shipping",   sub: "Manage rates",               bg: "linear-gradient(135deg,#0ea5e9,#0284c7)" },
              { href: "/admin/categories", label: "Categories", sub: "Manage",                     bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
            ].map(n => (
              <Link key={n.href} href={n.href} style={{ background: n.bg, color: "#fff", borderRadius: 18, padding: "22px 18px", textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.3 }}>{n.label}</span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{n.sub}</span>
                <span style={{ marginTop: 8, fontSize: 18, fontWeight: 300 }}>→</span>
              </Link>
            ))}
          </div>

          {/* ── Recent Orders ── */}
          <div className="dash-card" style={{ padding: 22, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>Recent Orders</p>
              <Link href="/admin/orders" style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p style={{ textAlign: "center", color: "#9ca3af", padding: 20, fontSize: 13 }}>No orders yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentOrders.map(order => {
                  const color = statusColors[order.status || "pending"] || "#9ca3af";
                  return (
                    <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: "#fafaf9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>#{order.id.slice(-6)}</span>
                          {order.customer_name && <span style={{ marginLeft: 8, fontSize: 13, color: "#6b7280" }}>{order.customer_name}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{fmt(parseFloat(String(order.total_amount)) || 0)} EGP</span>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + "22", color }}>{order.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Settings ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>

            {/* Favicon */}
            <div className="dash-card" style={{ padding: 20 }}>
              <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>Favicon</p>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, border: "1.5px solid #e5e7eb", overflow: "hidden", background: "#f9f9f9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {faviconUrl ? <img src={faviconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ width: 20, height: 20, borderRadius: 4, background: "#e5e7eb" }} />}
                </div>
                <label style={{ flex: 1, padding: "10px 16px", borderRadius: 10, background: "#1a1a2e", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                  {faviconUploading ? "..." : "Upload"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && uploadFavicon(e.target.files[0])} disabled={faviconUploading} />
                </label>
              </div>
              {faviconMsg && <p style={{ margin: "8px 0 0", fontSize: 12, color: faviconMsg.includes("✅") ? "#10b981" : "#ef4444", fontWeight: 600 }}>{faviconMsg}</p>}
            </div>

            {/* Hero Image */}
            <div className="dash-card" style={{ padding: 20 }}>
              <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>Hero Image</p>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 72, height: 48, borderRadius: 12, border: "1.5px solid #e5e7eb", overflow: "hidden", background: "#f9f9f9", flexShrink: 0 }}>
                  {heroUrl ? <img src={heroUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: "#e5e7eb" }} />}
                </div>
                <label style={{ flex: 1, padding: "10px 16px", borderRadius: 10, background: "#1a1a2e", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                  {heroUploading ? "..." : "Upload"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && uploadHero(e.target.files[0])} disabled={heroUploading} />
                </label>
              </div>
              {heroMsg && <p style={{ margin: "8px 0 0", fontSize: 12, color: heroMsg.includes("✅") ? "#10b981" : "#ef4444", fontWeight: 600 }}>{heroMsg}</p>}
            </div>
          </div>

          {/* Facebook */}
          <div className="dash-card" style={{ padding: 20, marginBottom: 20 }}>
            <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>Facebook Integration</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input value={fbPixelId} onChange={e => setFbPixelId(e.target.value)} placeholder="Pixel ID" style={{ flex: 1, minWidth: 180, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none" }} />
              <button onClick={async () => { try { await fetch(`${API_BASE}/settings/fb_pixel_id`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: fbPixelId }) }); setFbPixelMsg("Saved!"); } catch { setFbPixelMsg("Failed"); } setTimeout(() => setFbPixelMsg(""), 3000); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#1877f2", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
            </div>
            {fbPixelMsg && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#10b981", fontWeight: 600 }}>{fbPixelMsg}</p>}
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9ca3af" }}>Catalog Feed: <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{typeof window !== "undefined" ? window.location.origin : ""}/api/fb-feed</code></p>
          </div>

          {/* Featured Products */}
          <div className="dash-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Featured Products</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: featuredEnabled ? "#10b981" : "#9ca3af", fontWeight: 600 }}>{featuredEnabled ? "ON" : "OFF"}</span>
                <div onClick={() => setFeaturedEnabled(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, background: featuredEnabled ? "#1a1a2e" : "#e5e7eb", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                  <div style={{ position: "absolute", top: 2, left: featuredEnabled ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
                </div>
              </div>
            </div>
            <input value={featuredTitle} onChange={e => setFeaturedTitle(e.target.value)} placeholder="Section title..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
            <input value={featuredSearch} onChange={e => setFeaturedSearch(e.target.value)} placeholder="Search products..." style={{ width: "100%", padding: "8px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
            <div style={{ maxHeight: 280, overflowY: "auto", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 8 }}>
                {products.filter(p => !featuredSearch || p.name_en?.toLowerCase().includes(featuredSearch.toLowerCase())).slice(0, 80).map(p => {
                  const img = Array.isArray(p.images) ? p.images[0] : (p.images || "");
                  const sel = featuredIds.includes(p.id);
                  return (
                    <div key={p.id} onClick={() => setFeaturedIds(ids => ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])}
                      style={{ cursor: "pointer", borderRadius: 10, border: `2px solid ${sel ? "#1a1a2e" : "#e5e7eb"}`, overflow: "hidden", position: "relative", transition: "border-color 0.15s" }}>
                      <div style={{ aspectRatio: "3/4", overflow: "hidden", background: "#f3f4f6" }}>
                        <img src={img || "https://placehold.co/90x120/f3f4f6/9ca3af?text=?"} alt={p.name_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/90x120/f3f4f6/9ca3af?text=?"; }} />
                      </div>
                      {sel && <div style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700 }}>✓</div>}
                      <div style={{ padding: "5px 6px", background: "#fff" }}>
                        <div style={{ fontSize: 9, color: "#374151", fontWeight: 600, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name_en}</div>
                        <div style={{ fontSize: 9, color: "#1a1a2e", fontWeight: 700, marginTop: 2 }}>{p.price} EGP</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
              <button onClick={async () => { try { await fetch(`${API_BASE}/settings/featured_section`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: JSON.stringify({ title: featuredTitle, enabled: featuredEnabled, product_ids: featuredIds }) }) }); setFeaturedMsg("Saved!"); } catch { setFeaturedMsg("Failed"); } setTimeout(() => setFeaturedMsg(""), 3000); }} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
              {featuredIds.length > 0 && <button onClick={() => setFeaturedIds([])} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: 13, cursor: "pointer" }}>Clear</button>}
              {featuredMsg && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>{featuredMsg}</span>}
            </div>
          </div>

          {/* Change Password */}
          <div className="dash-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Change Password</p>
              <button onClick={() => { setShowChangePw(v => !v); setChangePwMsg(""); setChangePwForm({ current: "", next: "", confirm: "" }); }} style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#6b7280" }}>
                {showChangePw ? "Cancel" : "Change"}
              </button>
            </div>
            {showChangePw && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                {changePwMsg && <div style={{ padding: "10px 14px", borderRadius: 10, background: changePwMsg.includes("✅") ? "#ecfdf5" : "#fef2f2", color: changePwMsg.includes("✅") ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 600 }}>{changePwMsg}</div>}
                <div className="pw-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[{ label: "Current", key: "current" }, { label: "New", key: "next" }, { label: "Confirm", key: "confirm" }].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 5, fontWeight: 600 }}>{f.label}</label>
                      <input type="password" value={(changePwForm as any)[f.key]} onChange={e => setChangePwForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  if (changePwForm.current !== getAdminPw()) { setChangePwMsg("❌ Current password incorrect"); return; }
                  if (!changePwForm.next || changePwForm.next.length < 3) { setChangePwMsg("❌ Min 3 characters"); return; }
                  if (changePwForm.next !== changePwForm.confirm) { setChangePwMsg("❌ Passwords don't match"); return; }
                  localStorage.setItem("admin_pw", changePwForm.next);
                  setChangePwMsg("✅ Password changed!");
                  setChangePwForm({ current: "", next: "", confirm: "" });
                  setTimeout(() => setShowChangePw(false), 2000);
                }} style={{ alignSelf: "flex-start", padding: "10px 24px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* New Order Toast */}
      {newOrderToast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "#1a1a2e", color: "#fff", borderRadius: 18, padding: "16px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 14, minWidth: 280, animation: "slideUp 0.3s ease" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: "#fff" }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#a78bfa" }}>New Order</div>
            <div style={{ fontSize: 13, marginTop: 2, color: "#e5e7eb" }}>{newOrderToast.name} — {newOrderToast.total.toLocaleString()} EGP</div>
          </div>
          <button onClick={() => setNewOrderToast(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
          <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
      )}
    </>
  );
}