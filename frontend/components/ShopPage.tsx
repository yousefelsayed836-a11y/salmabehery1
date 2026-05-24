"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";

interface Product {
  id: string; name_en: string; name_ar?: string; description_en?: string;
  price: number; old_price?: number; material?: string; water_resistance?: string;
  size_info?: string; images?: string[]; main_image?: string; stock?: number;
  category_name?: string; is_active: boolean; variants?: any[];
}
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";
const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com";
const PAGE_SIZE = 24;

interface ColCache { products: Product[]; total: number; page: number; hasMore: boolean; }
const _colCache = new Map<string, ColCache>();

function getImg(p: Product) {
  const img = p.main_image || (p.images && p.images[0]);
  if (!img) return `https://placehold.co/400x400/fda1b7/fff?text=??`;
  return img.startsWith("http") ? img : `${BACKEND}${img}`;
}

function getEffectiveStock(p: Product): number {
  if (p.variants && p.variants.length > 0)
    return p.variants.reduce((s: number, v: any) => s + (Number(v.quantity) || 0), 0);
  return p.stock ?? 0;
}

interface Props { collectionSlug: string; title: string; breadcrumb: string; }

export default function ShopPage({ collectionSlug, title, breadcrumb }: Props) {
  const router = useRouter();
  const { cartItems, cartCount, cartTotal, addToCart, removeFromCart, updateQty } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showCart, setShowCart] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const productsRef = useRef<Product[]>([]);

  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    const cacheKey = `${collectionSlug}:${sortBy}`;
    // Serve from cache immediately on initial load — no fetch, no loading state
    if (!append && pageNum === 1 && _colCache.has(cacheKey)) {
      const cached = _colCache.get(cacheKey)!;
      setProducts(cached.products);
      productsRef.current = cached.products;
      setTotal(cached.total);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setLoading(false);
      return;
    }
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError("");
      const res = await fetch(
        `${API_BASE}/products?is_active=true&collection=${collectionSlug}&limit=${PAGE_SIZE}&page=${pageNum}&sort=${sortBy}`
      );
      const data = await res.json();
      const fetched: Product[] = data.products || [];
      const tot = data.pagination?.total ?? fetched.length;
      const allProducts = append ? [...productsRef.current, ...fetched] : fetched;
      const newHasMore = (pageNum * PAGE_SIZE) < tot;
      setTotal(tot);
      setProducts(allProducts);
      productsRef.current = allProducts;
      setHasMore(newHasMore);
      setPage(pageNum);
      _colCache.set(cacheKey, { products: allProducts, total: tot, page: pageNum, hasMore: newHasMore });
    } catch (e: any) { setError(e.message || "Failed"); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [collectionSlug, sortBy]);

  useEffect(() => { fetchProducts(1, false); }, [fetchProducts]);

  const scrollKey = `shopScroll_${collectionSlug}`;
  useEffect(() => {
    if (!loading && products.length > 0) {
      const saved = sessionStorage.getItem(scrollKey);
      if (saved) { sessionStorage.removeItem(scrollKey); document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, parseInt(saved)); requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ""; }); }
    }
  }, [loading, products.length, scrollKey]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchProducts(page + 1, true);
      }
    }, { rootMargin: "200px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, page, fetchProducts]);

  const handleAdd = (product: Product) => {
    const eff = getEffectiveStock(product);
    if (eff === 0) return;
    if (product.variants && product.variants.length > 0) {
      sessionStorage.setItem(`shopScroll_${collectionSlug}`, String(window.scrollY));
      router.push(`/products/${product.id}`);
      return;
    }
    addToCart(
      { id: product.id, name_en: product.name_en, price: product.price, image_url: getImg(product) },
      1, product.size_info || "", eff
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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{title}</h1>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "9px 14px", borderRadius: 25, border: "1.5px solid #f0d4dc", fontSize: 13, cursor: "pointer", background: "#fff", outline: "none" }}>
            <option value="newest">Newest</option><option value="price-low">Price ↑</option><option value="price-high">Price ↓</option><option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {loading ? (
          <div className="sg">{Array.from({length: 8}).map((_,i) => (
            <div key={i} className="pc-skeleton"><div className="sk-img"/><div style={{padding:"12px 14px"}}><div className="sk-line" style={{width:"80%",marginBottom:8}}/><div className="sk-line" style={{width:"50%"}}/></div></div>
          ))}</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
            <p>{error}</p>
            <button onClick={() => fetchProducts(1)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#fda1b7", color: "#fff", cursor: "pointer" }}>Retry</button>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#999" }}><div style={{ fontSize: 48 }}>📦</div><p>No products found</p></div>
        ) : (
          <>
            <div style={{ marginBottom: 16, fontSize: 13, color: "#888" }}>{products.length} of {total} products</div>
            <div className="sg">
              {sorted.map((p, idx) => {
                const img = getImg(p);
                const hasD = p.old_price && p.old_price > p.price;
                const disc = hasD ? Math.round((1 - p.price / p.old_price!) * 100) : 0;
                const eff = getEffectiveStock(p);
                const oos = eff === 0;
                const low = !oos && eff <= 3;
                const cartQty = cartItems.find(i => i.product.id === p.id)?.qty ?? 0;
                return (
                  <div key={p.id} className="pc">
                    <Link href={`/products/${p.id}`} style={{ textDecoration: "none", display: "block" }} onClick={() => sessionStorage.setItem(`shopScroll_${collectionSlug}`, String(window.scrollY))}>
                    <div style={{ position: "relative", aspectRatio: "1/1", background: "#fafafa", overflow: "hidden" }}>
                      <img src={img} alt={p.name_en} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }} className="pi"
                        loading={idx < 4 ? "eager" : "lazy"} decoding="async"
                        onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400/fda1b7/fff?text=??"; }} />
                      {oos && <span style={{ position: "absolute", bottom: 6, left: 6, background: "#6b7280", color: "#fff", padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 700 }}>Out of stock</span>}
                      {low && <span style={{ position: "absolute", bottom: 6, left: 6, background: "#ef4444", color: "#fff", padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 700 }}>{eff} left</span>}
                      {!oos && !low && <span style={{ position: "absolute", bottom: 6, left: 6, background: "#22c55e", color: "#fff", padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 700 }}>In Stock</span>}
                    </div>
                    </Link>
                    <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <Link href={`/products/${p.id}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name_en}</h3>
                      </Link>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className="price-block">
                          {hasD && <span style={{ fontSize: 13, color: "#1a1a2e", textDecoration: "line-through", fontWeight: 400 }}>{p.old_price} EGP</span>}
                          <span style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>{p.price} EGP</span>
                        </div>
                        {oos ? (
                          <button disabled style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "#e5e7eb", color: "#9ca3af", cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          </button>
                        ) : cartQty > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #fda1b7", borderRadius: 20, overflow: "hidden" }}>
                            <button onClick={e => { e.preventDefault(); updateQty(p.id, p.size_info || "", -1); }} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fda1b7" }}>−</button>
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

            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && <div style={{ textAlign: "center", padding: 24, color: "#fda1b7", fontSize: 14, fontWeight: 600 }}>Loading...</div>}
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px}
        .pc{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;box-shadow:0 2px 12px rgba(0,0,0,.05);transition:transform .2s,box-shadow .2s}
        @media(hover:hover){.pc:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(253,161,183,.15)!important}.pc:hover .pi{transform:scale(1.05)}}
        .price-block{display:flex;flex-direction:column;gap:2px}
        .pc-skeleton{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee}
        .sk-img{aspect-ratio:1/1;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:400px 100%;animation:shimmer 1.2s infinite}
        .sk-line{height:12px;border-radius:6px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:400px 100%;animation:shimmer 1.2s infinite}
        @media(max-width:768px){.sg{grid-template-columns:repeat(2,1fr);gap:10px}}
      `}</style>
    </div>
  );
}
