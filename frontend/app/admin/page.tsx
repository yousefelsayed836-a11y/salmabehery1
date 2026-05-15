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
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

const ADMIN_PASSWORD = "1122";

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

  useEffect(() => { fetchData(); }, []);

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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center", width: 300 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
        <h2 style={{ margin: "0 0 20px", color: "#1a1a2e", fontSize: 18 }}>Admin Access</h2>
        <input
          type="password" value={pw} onChange={e => { setPw(e.target.value); setPwError(false); }}
          onKeyDown={e => { if (e.key === "Enter") { if (pw === ADMIN_PASSWORD) { sessionStorage.setItem("admin_auth", "1"); setAuthed(true); } else setPwError(true); } }}
          placeholder="Enter password"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${pwError ? "#ef4444" : "#ddd"}`, fontSize: 15, boxSizing: "border-box", outline: "none", marginBottom: 12 }}
        />
        {pwError && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 10px" }}>Incorrect password</p>}
        <button onClick={() => { if (pw === ADMIN_PASSWORD) { sessionStorage.setItem("admin_auth", "1"); setAuthed(true); } else setPwError(true); }}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Login
        </button>
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
            <Link href="/admin/orders" style={{ background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", borderRadius: 16, padding: "24px 20px", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(253,161,183,0.3)", transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"}>
              <div style={{ fontSize: 36 }}>📦</div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Orders</h2>
              <span style={{ padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 600 }}>{totalOrders} orders →</span>
            </Link>

            <Link href="/admin/product" style={{ background: "#1a1a2e", color: "#fff", borderRadius: 16, padding: "24px 20px", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(26,26,46,0.3)", transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"}>
              <div style={{ fontSize: 36 }}>🛍️</div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Products</h2>
              <span style={{ padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.1)", fontSize: 12, fontWeight: 600 }}>{totalProducts} products →</span>
            </Link>

            <Link href="/admin/shipping" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", borderRadius: 16, padding: "24px 20px", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(99,102,241,0.3)", transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"}>
              <div style={{ fontSize: 36 }}>🚚</div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Shipping</h2>
              <span style={{ padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 600 }}>Manage rates →</span>
            </Link>

            <Link href="/admin/categories" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", borderRadius: 16, padding: "24px 20px", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(245,158,11,0.3)", transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"}>
              <div style={{ fontSize: 36 }}>🗂️</div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Categories</h2>
              <span style={{ padding: "4px 16px", borderRadius: 20, background: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 600 }}>Manage →</span>
            </Link>
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
    </>
  );
}