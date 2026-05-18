"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "../../components/CartContext";

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
  variants?: any[];
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";

function getProductImage(p: Product): string {
  const img = p.main_image || (p.images && p.images.find(i => i?.startsWith("http")));
  if (!img) return `https://placehold.co/400x400/fda1b7/fff?text=${encodeURIComponent(p.name_en?.slice(0, 6) || "??")}`;
  if (img.startsWith("http")) return img;
  return `${process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com"}${img}`;
}

function ShopContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { cartItems, cartCount, cartTotal, addToCart: ctxAddToCart, updateQty, removeFromCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [toast, setToast] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 24;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchProducts(1, false); }, [searchQuery]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchProducts(page + 1, true);
      }
    }, { rootMargin: "200px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, page]);

  const fetchProducts = async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true); else setLoadingMore(true);
      setError("");
      let url = `${API_BASE}/products?is_active=true&limit=${PAGE_SIZE}&page=${pageNum}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const fetched = data.products || [];
      const tot = data.pagination?.total ?? fetched.length;
      setTotal(tot);
      setProducts(prev => append ? [...prev, ...fetched] : fetched);
      setHasMore((pageNum * PAGE_SIZE) < tot);
      setPage(pageNum);
    } catch (err: any) { setError(err?.message || "Failed to load products"); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const addToCart = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      window.location.href = `/products/${product.id}`;
      return;
    }
    ctxAddToCart(
      { id: product.id, name_en: product.name_en, price: product.price, image_url: getProductImage(product) },
      1, product.size_info || "", product.stock
    );
    setToast(`✓ ${product.name_en.slice(0, 20)} added`);
    setTimeout(() => setToast(""), 2000);
  };

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
                          <button onClick={() => updateQty(item.product.id, item.size, -1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>-</button>
                          <span>{item.qty}</span>
                          <button onClick={() => updateQty(item.product.id, item.size, 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>+</button>
                          <button onClick={() => removeFromCart(item.product.id, item.size)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Remove</button>
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


      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {error && (
          <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "center" }}>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>{error}</span>
            <button onClick={() => fetchProducts(1, false)} style={{ marginLeft: 12, padding: "6px 12px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="products-grid">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #eee" }}>
                <div style={{ aspectRatio: "1/1", background: "linear-gradient(90deg,#f5f5f5 25%,#ebebeb 50%,#f5f5f5 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.2s infinite" }} />
                <div style={{ padding: 14 }}>
                  <div style={{ height: 14, background: "linear-gradient(90deg,#f5f5f5 25%,#ebebeb 50%,#f5f5f5 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.2s infinite", borderRadius: 6, marginBottom: 10, width: "75%" }} />
                  <div style={{ height: 12, background: "linear-gradient(90deg,#f5f5f5 25%,#ebebeb 50%,#f5f5f5 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.2s infinite", borderRadius: 6, width: "45%" }} />
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
            <div style={{ marginBottom: 16, fontSize: 13, color: "#888" }}>{products.length}{total > products.length ? ` of ${total}` : ""} products</div>
            <div className="products-grid">
              {sorted.map(p => {
                const img = getProductImage(p);
                const hasDiscount = p.old_price && p.old_price > p.price;
                const discount = hasDiscount ? Math.round((1 - p.price / p.old_price!) * 100) : 0;

                return (
                  <div key={p.id} className="product-card" style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", transition: "transform 0.2s, box-shadow 0.2s" }}>
                    <Link href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
                    <div className="product-image-wrapper" style={{ position: "relative", background: "#fff", overflow: "hidden", cursor: "pointer" }}>
                      <img src={img} alt={p.name_en} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block", transition: "transform 0.3s" }} className="product-image"
                        loading="lazy" decoding="async"
                        onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x400/fda1b7/fff?text=${encodeURIComponent(p.name_en?.slice(0, 6) || "??")}`; }} />
                      {p.water_resistance && <span style={{ position: "absolute", top: 8, right: 8, background: "#3b82f6", color: "#fff", padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 600 }}>💧</span>}
                      {p.stock !== undefined && p.stock > 0 && (
                        <span style={{ position: "absolute", bottom: 6, left: 6, background: p.stock <= 3 ? "#ef4444" : "#22c55e", color: "#fff", padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 700 }}>
                          {p.stock <= 5 ? `${p.stock} left` : "In Stock"}
                        </span>
                      )}
                      {p.stock === 0 && <span style={{ position: "absolute", bottom: 6, left: 6, background: "#6b7280", color: "#fff", padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 700 }}>Out of stock</span>}
                      
                    </div>
                    </Link>
                    <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <Link href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name_en}</h3>
                      </Link>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {hasDiscount && <span style={{ fontSize: 11, color: "#bbb", textDecoration: "line-through" }}>{p.old_price} EGP</span>}
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>{p.price} EGP</span>
                        </div>
                      {(() => {
                        const cartQty = cartItems.find(i => i.product.id === p.id)?.qty ?? 0;
                        const oos = p.stock === 0;
                        const size = p.size_info || "";
                        return oos ? (
                          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Out of Stock</span>
                        ) : cartQty > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #fda1b7", borderRadius: 20, overflow: "hidden" }}>
                            <button onClick={() => updateQty(p.id, size, -1)} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fda1b7" }}>−</button>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", minWidth: 16, textAlign: "center" }}>{cartQty}</span>
                            <button onClick={() => addToCart(p)} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fda1b7" }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(p)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          </button>
                        );
                      })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && <div style={{ textAlign: "center", padding: 24, color: "#fda1b7", fontSize: 14, fontWeight: 600 }}>Loading...</div>}
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
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {selectedProduct.old_price && selectedProduct.old_price > selectedProduct.price && <span style={{ fontSize: 14, color: "#bbb", textDecoration: "line-through" }}>{selectedProduct.old_price} EGP</span>}
                <span style={{ fontSize: 26, fontWeight: 800, color: "#fda1b7" }}>{selectedProduct.price} EGP</span>
              </div>
              {selectedProduct.description_en && <div style={{ fontSize: 13, lineHeight: 1.7, color: "#666" }} dangerouslySetInnerHTML={{ __html: selectedProduct.description_en }} />}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedProduct.material && <span style={{ padding: "6px 12px", borderRadius: 10, fontSize: 12, background: "#fda1b718", color: "#fda1b7", fontWeight: 700 }}>✨ {selectedProduct.material}</span>}
                {selectedProduct.water_resistance && <span style={{ padding: "6px 12px", borderRadius: 10, fontSize: 12, background: "#dbeafe", color: "#1e40af", fontWeight: 700 }}>💧 {selectedProduct.water_resistance}</span>}
                {selectedProduct.size_info && <span style={{ padding: "6px 12px", borderRadius: 10, fontSize: 12, background: "#fff", color: "#666", fontWeight: 700 }}>📏 {selectedProduct.size_info}</span>}
              </div>
              <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: "auto" }}>🛒 Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        @media (hover: hover) {
          .product-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(253,161,183,0.15) !important; }
          .product-card:hover .product-image { transform: scale(1.05); }
        }
        .product-image-wrapper { aspect-ratio: 1/1; }
        .product-image-wrapper img { width: 100%; height: 100%; object-fit: cover; object-position: center; }
        @media (max-width: 768px) {
          .products-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
        }
        @media (max-width: 480px) {
          .products-grid { gap: 8px; }
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
