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

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #f5f5f5; }
        input, select, textarea { font-size: 16px !important; }
        @media (max-width: 640px) {
          .admin-wrap { padding: 12px !important; }
          .admin-nav-grid { grid-template-columns: 1fr 1fr !important; }
          .admin-stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .admin-recent-row { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
        }
      `}</style>

      <div className="admin-wrap" style={{ minHeight: "100vh", padding: "16px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>🏠 Admin Dashboard</h1>
            <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Overview of your store</p>
          </div>

          {/* Stats */}
          <div className="admin-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>

            {/* Orders */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fda1b722", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📦</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Total Orders</p>
                  <p style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 800, color: "#1a1a2e" }}>{totalOrders}</p>
                </div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 600 }}>{pendingOrders} Pending</span>
            </div>

            {/* ✅ FIXED Revenue */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#dcfce722", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💰</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Total Revenue</p>
                  <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>{fmt(totalRevenue)} EGP</p>
                </div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 8, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 600 }}>Confirmed orders only</span>
            </div>

            {/* Products */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#dbeafe22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🛍️</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Products</p>
                  <p style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 800, color: "#1a1a2e" }}>{totalProducts}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 10px", borderRadius: 8, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 600 }}>{activeProducts} Active</span>
                {outOfStock > 0 && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#fee2e2", color: "#991b1b", fontSize: 12, fontWeight: 600 }}>{outOfStock} Out</span>}
              </div>
            </div>

            {/* Low Stock */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fef3c722", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⚠️</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Low Stock</p>
                  <p style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 800, color: lowStock > 0 ? "#f59e0b" : "#1a1a2e" }}>{lowStock}</p>
                </div>
              </div>
              <Link href="/admin/product" style={{ padding: "3px 10px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Manage →</Link>
            </div>
          </div>

          {/* Nav Cards */}
          <div className="admin-nav-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            <Link href="/admin/orders" style={{ background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", borderRadius: 16, padding: "24px 20px", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(253,161,183,0.3)" }}>
              <div style={{ fontSize: 36 }}>📦</div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Orders</h2>
              <span style={{ padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 600 }}>{totalOrders} orders →</span>
            </Link>

            <Link href="/admin/product" style={{ background: "#1a1a2e", color: "#fff", borderRadius: 16, padding: "24px 20px", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(26,26,46,0.3)" }}>
              <div style={{ fontSize: 36 }}>🛍️</div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Products</h2>
              <span style={{ padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.1)", fontSize: 12, fontWeight: 600 }}>{totalProducts} products →</span>
            </Link>

            <Link href="/admin/shipping" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", borderRadius: 16, padding: "24px 20px", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
              <div style={{ fontSize: 36 }}>🚚</div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Shipping</h2>
              <span style={{ padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 600 }}>Manage rates →</span>
            </Link>

            <Link href="/admin/categories" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", borderRadius: 16, padding: "24px 20px", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(245,158,11,0.3)" }}>
              <div style={{ fontSize: 36 }}>🗂️</div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Categories</h2>
              <span style={{ padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 600 }}>Manage →</span>
            </Link>
          </div>

          {/* Favicon Upload */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, border: "1.5px solid #eee", overflow: "hidden", background: "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {faviconUrl
                  ? <img src={faviconUrl} alt="favicon" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 20 }}>🖼️</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 2 }}>Favicon (Tab Icon)</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>The small icon that appears in the browser tab</div>
              </div>
              <label style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
                {faviconUploading ? "Uploading..." : "Upload New"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && uploadFavicon(e.target.files[0])} disabled={faviconUploading} />
              </label>
            </div>
            {faviconMsg && <div style={{ marginTop: 10, fontSize: 13, color: faviconMsg.includes("✅") ? "#166534" : "#991b1b", fontWeight: 600 }}>{faviconMsg}</div>}
          </div>

          {/* Hero Image Upload */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 80, height: 48, borderRadius: 10, border: "1.5px solid #eee", overflow: "hidden", background: "#f5f5f5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {heroUrl
                  ? <img src={heroUrl} alt="hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ fontSize: 20 }}>🖼️</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 2 }}>Hero Image</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>الصورة الرئيسية في أعلى الصفحة الأولى</div>
              </div>
              <label style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
                {heroUploading ? "Uploading..." : "Upload New"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && uploadHero(e.target.files[0])} disabled={heroUploading} />
              </label>
            </div>
            {heroMsg && <div style={{ marginTop: 10, fontSize: 13, color: heroMsg.includes("✅") ? "#166534" : "#991b1b", fontWeight: 600 }}>{heroMsg}</div>}
          </div>

          {/* Facebook Settings */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>📘 Facebook Integration</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 5 }}>Facebook Pixel ID</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={fbPixelId}
                    onChange={e => setFbPixelId(e.target.value)}
                    placeholder="e.g. 1234567890123456"
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none" }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE}/settings/fb_pixel_id`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ value: fbPixelId }),
                        });
                        setFbPixelMsg("✅ Saved!");
                      } catch { setFbPixelMsg("❌ Failed"); }
                      setTimeout(() => setFbPixelMsg(""), 3000);
                    }}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1877f2,#0c5fcf)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Save
                  </button>
                </div>
                {fbPixelMsg && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: fbPixelMsg.includes("✅") ? "#166534" : "#991b1b" }}>{fbPixelMsg}</div>}
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f0f4ff", fontSize: 13, color: "#4a5568" }}>
                <strong>Catalog Feed URL:</strong>{" "}
                <code style={{ fontSize: 12, background: "#e2e8f0", padding: "2px 6px", borderRadius: 4 }}>
                  {typeof window !== "undefined" ? window.location.origin : "https://yoursite.com"}/api/fb-feed
                </code>
                <span style={{ marginLeft: 8, color: "#888" }}>— Upload in Commerce Manager</span>
              </div>
            </div>
          </div>

          {/* Featured Products Section */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>⭐ Featured Products Section</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: featuredEnabled ? "#166534" : "#888", fontWeight: 600 }}>{featuredEnabled ? "ON" : "OFF"}</span>
                <div
                  onClick={() => setFeaturedEnabled(v => !v)}
                  style={{
                    width: 46, height: 26, borderRadius: 13,
                    background: featuredEnabled ? "#22c55e" : "#d1d5db",
                    position: "relative", cursor: "pointer", transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: featuredEnabled ? 23 : 3,
                    width: 20, height: 20, borderRadius: "50%", background: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s",
                  }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 5 }}>Section Title (shown on homepage)</label>
              <input
                value={featuredTitle}
                onChange={e => setFeaturedTitle(e.target.value)}
                placeholder="e.g. Our Picks, Best Sellers..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 5 }}>
                Select Products ({featuredIds.length} selected)
              </label>
              <input
                value={featuredSearch}
                onChange={e => setFeaturedSearch(e.target.value)}
                placeholder="Search products..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />
              <div style={{ maxHeight: 320, overflowY: "auto", border: "1.5px solid #eee", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                  {products
                    .filter(p => {
                      const s = featuredSearch.toLowerCase();
                      return !s || p.name_en?.toLowerCase().includes(s);
                    })
                    .slice(0, 80)
                    .map(p => {
                      const img = Array.isArray(p.images) ? p.images[0] : (p.images || "");
                      const selected = featuredIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => setFeaturedIds(ids =>
                            ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id]
                          )}
                          style={{
                            position: "relative", cursor: "pointer", borderRadius: 10,
                            border: `2.5px solid ${selected ? "#fda1b7" : "#eee"}`,
                            overflow: "hidden", background: "#f9f0f3",
                            boxShadow: selected ? "0 0 0 3px rgba(253,161,183,0.25)" : "none",
                            transition: "border-color 0.15s, box-shadow 0.15s",
                          }}
                        >
                          <div style={{ aspectRatio: "3/4", width: "100%", overflow: "hidden" }}>
                            <img
                              src={img || `https://placehold.co/120x160/fdf0f3/fda1b7?text=✨`}
                              alt={p.name_en}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/120x160/fdf0f3/fda1b7?text=✨`; }}
                            />
                          </div>
                          {selected && (
                            <div style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", background: "#fda1b7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>✓</div>
                          )}
                          <div style={{ padding: "5px 6px", background: "#fff" }}>
                            <div style={{ fontSize: 10, color: "#333", fontWeight: 600, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name_en}</div>
                            <div style={{ fontSize: 10, color: "#fda1b7", fontWeight: 700, marginTop: 2 }}>{p.price} EGP</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={async () => {
                  try {
                    await fetch(`${API_BASE}/settings/featured_section`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ value: JSON.stringify({ title: featuredTitle, enabled: featuredEnabled, product_ids: featuredIds }) }),
                    });
                    setFeaturedMsg("✅ Saved!");
                  } catch { setFeaturedMsg("❌ Failed to save"); }
                  setTimeout(() => setFeaturedMsg(""), 3000);
                }}
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                Save Featured Section
              </button>
              {featuredIds.length > 0 && (
                <button
                  onClick={() => setFeaturedIds([])}
                  style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #eee", background: "#fff", color: "#888", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Clear All
                </button>
              )}
              {featuredMsg && <span style={{ fontSize: 13, fontWeight: 600, color: featuredMsg.includes("✅") ? "#166534" : "#991b1b" }}>{featuredMsg}</span>}
            </div>
          </div>

          {/* Change Password Panel */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>🔐 Change Password</h3>
              <button onClick={() => { setShowChangePw(v => !v); setChangePwMsg(""); setChangePwForm({ current: "", next: "", confirm: "" }); }}
                style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #eee", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#555" }}>
                {showChangePw ? "Cancel" : "Change →"}
              </button>
            </div>
            {showChangePw && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {changePwMsg && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: changePwMsg.includes("✅") ? "#dcfce7" : "#fee2e2", color: changePwMsg.includes("✅") ? "#166534" : "#991b1b", fontSize: 13, fontWeight: 600 }}>
                    {changePwMsg}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 5 }}>Current Password</label>
                    <input type="password" value={changePwForm.current} onChange={e => setChangePwForm(f => ({ ...f, current: e.target.value }))}
                      placeholder="Current password"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 5 }}>New Password</label>
                    <input type="password" value={changePwForm.next} onChange={e => setChangePwForm(f => ({ ...f, next: e.target.value }))}
                      placeholder="New password"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 5 }}>Confirm New</label>
                    <input type="password" value={changePwForm.confirm} onChange={e => setChangePwForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder="Confirm password"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <button onClick={() => {
                  if (changePwForm.current !== getAdminPw()) { setChangePwMsg("❌ Current password is incorrect"); return; }
                  if (!changePwForm.next || changePwForm.next.length < 3) { setChangePwMsg("❌ New password must be at least 3 characters"); return; }
                  if (changePwForm.next !== changePwForm.confirm) { setChangePwMsg("❌ Passwords do not match"); return; }
                  localStorage.setItem("admin_pw", changePwForm.next);
                  setChangePwMsg("✅ Password changed successfully!");
                  setChangePwForm({ current: "", next: "", confirm: "" });
                  setTimeout(() => setShowChangePw(false), 2000);
                }}
                  style={{ alignSelf: "flex-start", padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  Save Password
                </button>
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Recent Orders</h3>
              <Link href="/admin/orders" style={{ color: "#fda1b7", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>View All →</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", padding: 20 }}>No orders yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentOrders.map(order => (
                  <div key={order.id} className="admin-recent-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "#f9f9f9", marginBottom: 4 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "#fda1b7" }}>#{order.id.slice(-6)}</span>
                      {order.customer_name && <span style={{ marginLeft: 10, fontSize: 13, color: "#555" }}>{order.customer_name}</span>}
                      <span style={{ marginLeft: 10, fontSize: 13, color: "#888" }}>{fmt(parseFloat(String(order.total_amount)) || 0)} EGP</span>
                    </div>
                    <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: order.status === "pending" ? "#fef3c7" : order.status === "completed" || order.status === "delivered" ? "#dcfce7" : order.status === "cancelled" ? "#fee2e2" : "#f3f4f6", color: order.status === "pending" ? "#92400e" : order.status === "completed" || order.status === "delivered" ? "#166534" : order.status === "cancelled" ? "#991b1b" : "#6b7280" }}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
      {/* New Order Toast */}
      {newOrderToast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "#1a1a2e", color: "#fff", borderRadius: 16, padding: "16px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 14, minWidth: 280, animation: "slideUp 0.3s ease" }}>
          <div style={{ fontSize: 32 }}>🛍️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#fda1b7" }}>أوردر جديد!</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{newOrderToast.name} — {newOrderToast.total.toLocaleString()} EGP</div>
          </div>
          <button onClick={() => setNewOrderToast(null)} style={{ marginRight: "auto", background: "none", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
          <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
      )}
    </>
  );
}