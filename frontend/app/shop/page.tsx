"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Product {
  id: string;
  name_en: string;
  name_ar?: string;
  description_en?: string;
  price: number;
  old_price?: number;
  material?: string;
  water_resistance?: string;
  size_info?: string;
  images?: string[];
  main_image?: string;
  category_name?: string;
  category_slug?: string;
  handle?: string;
  stock?: number;
  is_active: boolean;
}

interface CartItem {
  product: { id: string; name_en: string; price: number; image_url?: string; };
  qty: number;
  size: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

function getProductImage(p: Product): string {
  const img = p.main_image || (p.images && p.images.find(i => i?.startsWith("http")));
  if (!img) return `https://placehold.co/400x400/fda1b7/fff?text=${encodeURIComponent(p.name_en?.slice(0, 6) || "??")}`;
  if (img.startsWith("http")) return img;
  return `${process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com"}${img}`;
}

function ShopContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) setCartItems(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cartItems));
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {}
  }, [cartItems]);

  useEffect(() => { fetchProducts(); }, [searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true); setError("");
      let url = `${API_BASE}/products?is_active=true&limit=500`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) { setError(err?.message || "Failed to load products"); }
    finally { setLoading(false); }
  };

  const addToCart = (product: Product, qty: number = 1) => {
    const size = product.size_info || "One Size";
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id && i.size === size);
      if (idx >= 0) { const c = [...prev]; c[idx] = { ...c[idx], qty: Math.min(10, c[idx].qty + qty) }; return c; }
      return [...prev, { product: { id: product.id, name_en: product.name_en, price: product.price, image_url: getProductImage(product) }, qty, size }];
    });
    setToast(`✓ ${product.name_en.slice(0, 20)} added to cart`);
    setTimeout(() => setToast(""), 2000);
  };

  const cartTotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const sorted = [...products].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "name") return a.name_en.localeCompare(b.name_en);
    return 0;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter', sans-serif" }}>

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: 13, fontWeight: 600, zIndex: 500, whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      {/* Floating Cart */}
      <button onClick={() => setShowCart(true)} style={{ position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", border: "none", fontSize: 24, cursor: "pointer", zIndex: 100, boxShadow: "0 4px 16px rgba(253,161,183,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        🛒
        {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 22, height: 22, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
      </button>

      {/* Cart Sidebar */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCart(false)}>
          <div style={{ position: "absolute", right: 0, top: 0, width: 380, maxWidth: "90%", height: "100%", background: "#fff", padding: 24, overflowY: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🛒 Your Cart</h2>
              <button onClick={() => setShowCart(false)} style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", color: "#999" }}>×</button>
            </div>
            {cartItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {cartItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #eee" }}>
                      <img src={item.product.image_url || ""} alt={item.product.name_en} style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/60x60/fda1b7/fff?text=?"; }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product.name_en}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                          <button onClick={() => setCartItems(p => p.map(x => x.product.id === item.product.id && x.size === item.size ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>-</button>
                          <span>{item.qty}</span>
                          <button onClick={() => setCartItems(p => p.map(x => x.product.id === item.product.id && x.size === item.size ? { ...x, qty: Math.min(10, x.qty + 1) } : x))} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>+</button>
                          <button onClick={() => setCartItems(p => p.filter(x => !(x.product.id === item.product.id && x.size === item.size)))} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Remove</button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#fda1b7" }}>{item.product.price * item.qty} EGP</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "2px solid #eee", paddingTop: 16, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span>Subtotal:</span><span style={{ fontWeight: 700 }}>{cartTotal} EGP</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 12, color: "#888" }}><span>Shipping:</span><span>{cartTotal >= 900 ? "FREE 🎉" : "50 EGP"}</span></div>
                  <a href="/checkout" style={{ display: "block", width: "100%", padding: 14, borderRadius: 12, background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>Checkout →</a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sort bar */}
      <div style={{ background: "#fff", padding: "12px 24px", borderBottom: "1px solid #f0dde3", boxShadow: "0 2px 8px rgba(253,161,183,0.08)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>
              {searchQuery ? `Results for "${searchQuery}"` : "All Products"}
            </h1>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
              <Link href="/" style={{ color: "#fda1b7", textDecoration: "none" }}>Home</Link>
              <span style={{ margin: "0 6px" }}>/</span>
              <span>Shop</span>
            </div>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "9px 14px", borderRadius: 25, border: "1.5px solid #f0d4dc", fontSize: 13, cursor: "pointer", background: "#fff", color: "#333", outline: "none" }}>
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {error && (
          <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "center" }}>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>{error}</span>
            <button onClick={fetchProducts} style={{ marginLeft: 12, padding: "6px 12px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="products-grid">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 10px rgba(253,161,183,0.1)" }}>
                <div style={{ height: 200, background: "#fff", animation: "pulse 1.5s infinite" }} />
                <div style={{ padding: 14 }}>
                  <div style={{ height: 16, background: "#fff", borderRadius: 4, marginBottom: 8, width: "70%", animation: "pulse 1.5s infinite" }} />
                  <div style={{ height: 14, background: "#fff", borderRadius: 4, width: "40%", animation: "pulse 1.5s infinite" }} />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>No products found</p>
            {searchQuery && <Link href="/shop" style={{ color: "#fda1b7", textDecoration: "none", fontSize: 14 }}>← Back to all products</Link>}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16, fontSize: 13, color: "#888" }}>{sorted.length} products</div>
            <div className="products-grid">
              {sorted.map(p => {
                const img = getProductImage(p);
                const hasDiscount = p.old_price && p.old_price > p.price;
                const discount = hasDiscount ? Math.round((1 - p.price / p.old_price!) * 100) : 0;
                const qty = quantities[p.id] || 1;

                return (
                  <div key={p.id} className="product-card" style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(253,161,183,0.1)", transition: "transform 0.2s, box-shadow 0.2s" }}>
                    <Link href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
                    <div className="product-image-wrapper" style={{ position: "relative", aspectRatio: "1/1", background: "#fff", overflow: "hidden", cursor: "pointer" }}>
                      <img src={img} alt={p.name_en} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }} className="product-image" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x400/fda1b7/fff?text=${encodeURIComponent(p.name_en?.slice(0, 6) || "??")}`; }} />
                      {hasDiscount && <span style={{ position: "absolute", top: 10, left: 10, background: "#ef4444", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>-{discount}%</span>}
                      {p.water_resistance && <span style={{ position: "absolute", top: 10, right: 10, background: "#3b82f6", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600 }}>💧</span>}
                      {p.stock !== undefined && p.stock > 0 && (
                      <span style={{ position: "absolute", bottom: 8, left: 8, background: p.stock <= 3 ? "#ef4444" : "#22c55e", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                        {p.stock <= 5 ? `Only ${p.stock} left!` : `In stock: ${p.stock}`}
                      </span>
                    )}
                    {p.stock === 0 && <span style={{ position: "absolute", bottom: 8, left: 8, background: "#6b7280", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Out of stock</span>}
                      
                    </div>
                    </Link>
                    <div style={{ padding: "14px 14px 16px" }}>
                      <Link href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.3, cursor: "pointer" }}>{p.name_en}</h3>
                      </Link>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>{p.price} EGP</span>
                        {hasDiscount && <span style={{ fontSize: 12, color: "#bbb", textDecoration: "line-through" }}>{p.old_price} EGP</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #f0d4dc", borderRadius: 8, overflow: "hidden" }}>
                          <button onClick={() => setQuantities(q => ({ ...q, [p.id]: Math.max(1, (q[p.id] || 1) - 1) }))} style={{ width: 30, height: 34, border: "none", background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#fda1b7" }}>−</button>
                          <span style={{ width: 32, textAlign: "center", fontSize: 13, fontWeight: 600, background: "#fff", lineHeight: "34px" }}>{qty}</span>
                          <button onClick={() => setQuantities(q => ({ ...q, [p.id]: Math.min(10, (q[p.id] || 1) + 1) }))} style={{ width: 30, height: 34, border: "none", background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#fda1b7" }}>+</button>
                        </div>
                        <button onClick={() => addToCart(p, qty)} style={{ flex: 1, height: 34, borderRadius: 8, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🛒 Add</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", padding: 20 }} onClick={() => setSelectedProduct(null)}>
          <div style={{ background: "#fff", borderRadius: 20, width: 860, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr" }} onClick={e => e.stopPropagation()}>
            <div style={{ background: "#fff", minHeight: 380, position: "relative" }}>
              <img src={getProductImage(selectedProduct)} alt={selectedProduct.name_en} style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 380 }} />
            </div>
            <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  {selectedProduct.category_name && <span style={{ fontSize: 11, color: "#fda1b7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{selectedProduct.category_name}</span>}
                  <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>{selectedProduct.name_en}</h2>
                </div>
                <button onClick={() => setSelectedProduct(null)} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#aaa" }}>×</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "#fda1b7" }}>{selectedProduct.price} EGP</span>
                {selectedProduct.old_price && selectedProduct.old_price > selectedProduct.price && <span style={{ fontSize: 16, color: "#bbb", textDecoration: "line-through" }}>{selectedProduct.old_price} EGP</span>}
              </div>
              {selectedProduct.description_en && <div style={{ fontSize: 13, lineHeight: 1.7, color: "#666" }} dangerouslySetInnerHTML={{ __html: selectedProduct.description_en }} />}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedProduct.material && <span style={{ padding: "6px 12px", borderRadius: 10, fontSize: 12, background: "#fda1b718", color: "#fda1b7", fontWeight: 700 }}>✨ {selectedProduct.material}</span>}
                {selectedProduct.water_resistance && <span style={{ padding: "6px 12px", borderRadius: 10, fontSize: 12, background: "#dbeafe", color: "#1e40af", fontWeight: 700 }}>💧 {selectedProduct.water_resistance}</span>}
                {selectedProduct.size_info && <span style={{ padding: "6px 12px", borderRadius: 10, fontSize: 12, background: "#fff", color: "#666", fontWeight: 700 }}>📏 {selectedProduct.size_info}</span>}
              </div>
              <button onClick={() => { addToCart(selectedProduct, quantities[selectedProduct.id] || 1); setSelectedProduct(null); }} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: "auto" }}>🛒 Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(253,161,183,0.2) !important; }
        .product-image-wrapper:hover .product-image { transform: scale(1.05); }
        @media (max-width: 768px) {
          .products-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
          .product-image-wrapper { height: 180px !important; }
        }
        @media (max-width: 480px) {
          .products-grid { gap: 8px; }
          .product-image-wrapper { height: 150px !important; }
        }
      `}</style>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 60, color: "#888" }}>Loading...</div>}>
      <ShopContent />
    </Suspense>
  );
}
