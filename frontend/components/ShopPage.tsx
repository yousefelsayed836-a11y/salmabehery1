"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";

interface Product {
  id: string; name_en: string; name_ar?: string; description_en?: string;
  price: number; old_price?: number; material?: string; water_resistance?: string;
  size_info?: string; images?: string[]; main_image?: string; stock?: number;
  category_name?: string; is_active: boolean;
}
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";
const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com";

function getImg(p: Product) {
  const img = p.main_image || (p.images && p.images[0]);
  if (!img) return `https://placehold.co/400x400/fda1b7/fff?text=??`;
  return img.startsWith("http") ? img : `${BACKEND}${img}`;
}

interface Props { collectionSlug: string; title: string; breadcrumb: string; }

export default function ShopPage({ collectionSlug, title, breadcrumb }: Props) {
  const router = useRouter();
  const { cartItems, cartCount, cartTotal, addToCart, removeFromCart, updateQty } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showCart, setShowCart] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${API_BASE}/products?is_active=true&collection=${collectionSlug}&limit=500`, { cache: "no-store" });
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e: any) { setError(e.message || "Failed"); }
    finally { setLoading(false); }
  }, [collectionSlug]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleAdd = (product: Product) => {
    if ((product.stock ?? 1) === 0) return;
    addToCart(
      { id: product.id, name_en: product.name_en, price: product.price, image_url: getImg(product) },
      1, product.size_info || "One Size", product.stock
    );
  };

  const sorted = [...products].sort((a, b) =>
    sortBy === "price-low" ? a.price - b.price : sortBy === "price-high" ? b.price - a.price :
    sortBy === "name" ? a.name_en.localeCompare(b.name_en) : 0
  );

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>

      {/* Cart sidebar */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCart(false)}>
          <div style={{ position: "absolute", right: 0, top: 0, width: 380, maxWidth: "90%", height: "100%", background: "#fff", padding: 24, overflowY: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🛒 Cart ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer" }}>×</button>
            </div>
            {cartItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}><div style={{ fontSize: 48 }}>🛒</div><p>Cart is empty</p></div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {cartItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #eee" }}>
                      <div style={{ width: 60, height: 60, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#fafafa" }}>
                        {item.product.image_url ? <img src={item.product.image_url} alt={item.product.name_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 20 }}>💍</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.name_en}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                          <button onClick={() => updateQty(item.product.id, item.size, -1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>-</button>
                          <span style={{ fontWeight: 600 }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.product.id, item.size, 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>+</button>
                          <button onClick={() => removeFromCart(item.product.id, item.size)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Remove</button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#fda1b7", fontSize: 13, flexShrink: 0 }}>{item.product.price * item.qty} EGP</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "2px solid #eee", paddingTop: 16, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: "#888", fontSize: 14 }}>Subtotal</span><span style={{ fontWeight: 700 }}>{cartTotal} EGP</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13, color: "#888" }}><span>Shipping</span><span style={{ color: cartTotal >= 900 ? "#22c55e" : "#333", fontWeight: 600 }}>{cartTotal >= 900 ? "FREE 🎉" : "At checkout"}</span></div>
                  <button onClick={() => { setShowCart(false); router.push("/checkout"); }} style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Checkout Now →</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sort bar */}
      <div style={{ background: "#fff", padding: "12px 24px", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{title}</h1>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
              <Link href="/" style={{ color: "#fda1b7", textDecoration: "none" }}>Home</Link><span style={{ margin: "0 6px" }}>/</span><span>{breadcrumb}</span>
            </div>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "9px 14px", borderRadius: 25, border: "1.5px solid #f0d4dc", fontSize: 13, cursor: "pointer", background: "#fff", outline: "none" }}>
            <option value="newest">Newest</option><option value="price-low">Price ↑</option><option value="price-high">Price ↓</option><option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {loading ? (
          <div className="sg"><div/><div/><div/><div/><div/><div/></div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#999" }}><div style={{ fontSize: 48 }}>📦</div><p>No products found</p></div>
        ) : (
          <>
            <div style={{ marginBottom: 16, fontSize: 13, color: "#888" }}>{sorted.length} products</div>
            <div className="sg">
              {sorted.map(p => {
                const img = getImg(p);
                const hasD = p.old_price && p.old_price > p.price;
                const disc = hasD ? Math.round((1 - p.price / p.old_price!) * 100) : 0;
                const oos = (p.stock ?? 1) === 0;
                const low = !oos && (p.stock ?? 99) <= 3;
                const cartQty = cartItems.find(i => i.product.id === p.id)?.qty ?? 0;
                return (
                  <div key={p.id} className="pc" style={{ opacity: oos ? 0.65 : 1 }}>
                    <Link href={`/products/${p.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ position: "relative", aspectRatio: "1/1", background: "#fafafa", overflow: "hidden" }}>
                      <img src={img} alt={p.name_en} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }} className="pi" loading="lazy" onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400/fda1b7/fff?text=??"; }} />
                      {hasD && <span style={{ position: "absolute", top: 10, left: 10, background: "#ef4444", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>-{disc}%</span>}
                      {oos && <span style={{ position: "absolute", bottom: 8, left: 8, background: "#6b7280", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Out of stock</span>}
                      {low && <span style={{ position: "absolute", bottom: 8, left: 8, background: "#ef4444", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Only {p.stock} left!</span>}
                      {!oos && !low && p.stock !== undefined && <span style={{ position: "absolute", bottom: 8, left: 8, background: "#22c55e", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>In stock: {p.stock}</span>}
                    </div>
                    </Link>
                    <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <Link href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name_en}</h3>
                      </Link>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>{p.price} EGP</span>
                          {hasD && <span style={{ fontSize: 11, color: "#bbb", textDecoration: "line-through", marginLeft: 6 }}>{p.old_price} EGP</span>}
                        </div>
                        {oos ? (
                          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Out of Stock</span>
                        ) : cartQty > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #fda1b7", borderRadius: 20, overflow: "hidden" }}>
                            <button onClick={e => { e.preventDefault(); updateQty(p.id, p.size_info || "One Size", -1); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fda1b7" }}>−</button>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", minWidth: 16, textAlign: "center" }}>{cartQty}</span>
                            <button onClick={e => { e.preventDefault(); handleAdd(p); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fda1b7" }}>+</button>
                          </div>
                        ) : (
                          <button onClick={e => { e.preventDefault(); handleAdd(p); }} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
        .pc{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;box-shadow:0 2px 12px rgba(0,0,0,.05);transition:transform .2s,box-shadow .2s}
        .pc:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(253,161,183,.15)!important}
        .pc:hover .pi{transform:scale(1.05)}
        @media(max-width:768px){.sg{grid-template-columns:repeat(2,1fr);gap:10px}}
      `}</style>
    </div>
  );
}
