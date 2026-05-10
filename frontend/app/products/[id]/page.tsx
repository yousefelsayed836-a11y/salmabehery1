"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com";
const API = BACKEND + "/api";

interface Product {
  id: string;
  name_en: string;
  description_en?: string;
  price: number;
  old_price?: number;
  material?: string;
  water_resistance?: string;
  size_info?: string;
  images?: string[];
  main_image?: string;
  stock?: number;
  is_active: boolean;
  category_name?: string;
  category_slug?: string;
}


function getImg(p: Product, idx = 0): string {
  const imgs = p.images && p.images.length > 0 ? p.images : p.main_image ? [p.main_image] : [];
  const img = imgs[idx] || imgs[0] || "";
  if (!img) return `https://placehold.co/600x600/fda1b7/fff?text=${encodeURIComponent(p.name_en?.slice(0, 6) || "??")}`;
  return img.startsWith("http") ? img : `${BACKEND}${img}`;
}

export default function ProductPage() {
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [similar, setSimilar] = useState<Product[]>([]);


  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`${API}/products/${productId}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const p = d.product || d;
        setProduct(p);
        setLoading(false);
        if (p.category_slug) {
          fetch(`${API}/products?collection=${p.category_slug}&limit=8`)
            .then(r => r.json())
            .then(data => {
              const all: Product[] = data.products || data.data || [];
              setSimilar(all.filter((x: Product) => x.id !== productId).slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch(() => setLoading(false));

  }, [productId]);

  const addToCart = (p: Product, count = 1) => {
    const img = getImg(p);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const idx = cart.findIndex((i: any) => i.product.id === p.id);
    if (idx >= 0) cart[idx].qty = Math.min(10, cart[idx].qty + count);
    else cart.push({ product: { id: p.id, name_en: p.name_en, price: p.price, image_url: img }, qty: count, size: p.size_info || "One Size" });
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const images = product
    ? product.images && product.images.length > 0 ? product.images : product.main_image ? [product.main_image] : []
    : [];

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💍</div>
        <p style={{ color: "#aaa", fontSize: 14 }}>Loading...</p>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: "#1a1a2e", marginBottom: 12 }}>Product not found</h2>
        <Link href="/shop" style={{ color: "#fda1b7", fontWeight: 700, textDecoration: "none" }}>← Back to Shop</Link>
      </div>
    </div>
  );

  const hasDiscount = product.old_price && product.old_price > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / product.old_price!) * 100) : 0;
  const inStock = (product.stock ?? 1) > 0;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* Breadcrumb */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #f5e6ea", background: "#fafafa" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", fontSize: 12, color: "#aaa", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#fda1b7", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/shop" style={{ color: "#fda1b7", textDecoration: "none" }}>Shop</Link>
          {product.category_name && <>
            <span>/</span>
            <Link href={`/shop/${product.category_slug || ""}`} style={{ color: "#fda1b7", textDecoration: "none" }}>{product.category_name}</Link>
          </>}
          <span>/</span>
          <span style={{ color: "#555" }}>{product.name_en}</span>
        </div>
      </div>

      {/* Main product section */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <div className="pd-layout">

          {/* ── Images ── */}
          <div>
            {/* Thumbnails (desktop: left column, mobile: row below) */}
            {images.length > 1 && (
              <div className="thumbs-col">
                {images.map((img, i) => {
                  const src = img.startsWith("http") ? img : `${BACKEND}${img}`;
                  return (
                    <div key={i} onClick={() => setActiveImg(i)}
                      style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", cursor: "pointer", flexShrink: 0,
                        border: `2px solid ${activeImg === i ? "#fda1b7" : "#eee"}`, transition: "border-color 0.2s" }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64/fda1b7/fff?text=?"; }} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Main image */}
            <div style={{ flex: 1, borderRadius: 20, overflow: "hidden", background: "#f9f0f3", position: "relative", aspectRatio: "1/1" }}>
              {hasDiscount && (
                <span style={{ position: "absolute", top: 14, left: 14, background: "#ef4444", color: "#fff",
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, zIndex: 2 }}>
                  -{discount}%
                </span>
              )}
              <img src={getImg(product, activeImg)} alt={product.name_en}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/600x600/fda1b7/fff?text=??"; }} />
            </div>

            {/* Thumbnail row (mobile) */}
            {images.length > 1 && (
              <div className="thumbs-row">
                {images.map((img, i) => {
                  const src = img.startsWith("http") ? img : `${BACKEND}${img}`;
                  return (
                    <div key={i} onClick={() => setActiveImg(i)}
                      style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", cursor: "pointer", flexShrink: 0,
                        border: `2px solid ${activeImg === i ? "#fda1b7" : "#eee"}`, transition: "border-color 0.2s" }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/56x56/fda1b7/fff?text=?"; }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {product.category_name && (
              <Link href={`/shop/${product.category_slug || ""}`}
                style={{ fontSize: 11, fontWeight: 700, color: "#fda1b7", textTransform: "uppercase", letterSpacing: 2, textDecoration: "none" }}>
                {product.category_name}
              </Link>
            )}

            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", margin: 0, lineHeight: 1.35 }}>
              {product.name_en}
            </h1>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#fda1b7" }}>{product.price} EGP</span>
              {hasDiscount && <span style={{ fontSize: 17, color: "#bbb", textDecoration: "line-through" }}>{product.old_price} EGP</span>}
              {hasDiscount && <span style={{ fontSize: 13, background: "#fef2f2", color: "#ef4444", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>Save {discount}%</span>}
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {product.material && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#fdf4f7", color: "#c97a8a", fontSize: 12, fontWeight: 700, border: "1px solid #fce4ec" }}>✨ {product.material}</span>}
              {product.water_resistance && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#eff6ff", color: "#1e40af", fontSize: 12, fontWeight: 700, border: "1px solid #dbeafe" }}>💧 {product.water_resistance}</span>}
              {product.size_info && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 700, border: "1px solid #dcfce7" }}>📏 {product.size_info}</span>}
            </div>

            {/* Description */}
            {product.description_en && (
              <div style={{ fontSize: 14, lineHeight: 1.9, color: "#666", padding: "14px 16px", background: "#fdf9fb", borderRadius: 12, borderLeft: "3px solid #fda1b7" }}
                dangerouslySetInnerHTML={{ __html: product.description_en }} />
            )}

            {/* Stock */}
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {!inStock
                ? <span style={{ color: "#ef4444" }}>● Out of Stock</span>
                : product.stock && product.stock <= 5
                  ? <span style={{ color: "#f59e0b" }}>● Only {product.stock} left!</span>
                  : <span style={{ color: "#22c55e" }}>● In Stock</span>}
            </div>

            {/* Qty + Add to cart */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #f0d4dc", borderRadius: 12, overflow: "hidden" }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{ width: 42, height: 48, border: "none", background: "#fff", fontSize: 20, fontWeight: 700, color: "#fda1b7", cursor: "pointer" }}>−</button>
                <span style={{ width: 44, textAlign: "center", fontWeight: 700, fontSize: 16 }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(10, q + 1))}
                  style={{ width: 42, height: 48, border: "none", background: "#fff", fontSize: 20, fontWeight: 700, color: "#fda1b7", cursor: "pointer" }}>+</button>
              </div>
              <button onClick={handleAddToCart} disabled={!inStock}
                style={{ flex: 1, height: 48, borderRadius: 12, border: "none",
                  background: !inStock ? "#e5e7eb" : added ? "#22c55e" : "linear-gradient(135deg,#fda1b7,#f78fa3)",
                  color: !inStock ? "#9ca3af" : "#fff", fontSize: 15, fontWeight: 700,
                  cursor: !inStock ? "not-allowed" : "pointer", transition: "all 0.3s" }}>
                {!inStock ? "Out of Stock" : added ? "✓ Added to Cart!" : "🛒 Add to Cart"}
              </button>
            </div>

            {/* Buy Now */}
            <Link href="/checkout"
              style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 12,
                border: "2px solid #fda1b7", color: "#fda1b7", fontSize: 15, fontWeight: 700,
                textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#fda1b7"; (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "#fda1b7"; }}>
              ⚡ Buy Now
            </Link>

            {/* Perks */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "14px 16px", background: "#fdf9fb", borderRadius: 12 }}>
              <span style={{ fontSize: 12, color: "#777", display: "flex", alignItems: "center", gap: 6 }}>🚚 Free shipping above 900 EGP</span>
              <span style={{ fontSize: 12, color: "#777", display: "flex", alignItems: "center", gap: 6 }}>💳 Cash on Delivery</span>
              <span style={{ fontSize: 12, color: "#777", display: "flex", alignItems: "center", gap: 6 }}>🔄 Easy returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar Products ── */}
      {similar.length > 0 && (
        <div style={{ background: "#fff", padding: "48px 20px", borderTop: "1px solid #f5e6ea" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", marginBottom: 24, textAlign: "center" }}>
              You May Also Like
            </h2>
            <div className="sim-grid">
              {similar.map(p => {
                const img = getImg(p);
                const disc = p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
                return (
                  <Link key={p.id} href={`/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="sim-card">
                      <div style={{ position: "relative", aspectRatio: "1/1", background: "#f9f0f3", overflow: "hidden" }}>
                        {disc > 0 && <span style={{ position: "absolute", top: 8, left: 8, background: "#ef4444", color: "#fff", padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, zIndex: 2 }}>-{disc}%</span>}
                        <img src={img} alt={p.name_en} className="sim-img"
                          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                          onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400/fda1b7/fff?text=??"; }} />
                      </div>
                      <div style={{ padding: "12px 14px 14px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: "0 0 6px", lineHeight: 1.4,
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{p.name_en}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontWeight: 800, color: "#fda1b7", fontSize: 15 }}>{p.price} EGP</span>
                          {p.old_price && p.old_price > p.price && <span style={{ fontSize: 12, color: "#bbb", textDecoration: "line-through" }}>{p.old_price} EGP</span>}
                        </div>
                        <button onClick={e => { e.preventDefault(); addToCart(p, 1); }}
                          style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 8, border: "none",
                            background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .pd-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: start;
        }
        .pd-layout > div:first-child {
          display: flex;
          gap: 12px;
        }
        .thumbs-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .thumbs-row {
          display: none;
        }
        .sim-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        .sim-card {
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #eee;
          box-shadow: 0 2px 10px rgba(253,161,183,0.08);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sim-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(253,161,183,0.18) !important; }
        .sim-card:hover .sim-img { transform: scale(1.06); }

        @media (max-width: 768px) {
          .pd-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .pd-layout > div:first-child {
            flex-direction: column;
          }
          .thumbs-col { display: none; }
          .thumbs-row {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            margin-top: 10px;
          }
          .sim-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
