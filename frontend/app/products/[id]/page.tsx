"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com";
const API = BACKEND + "/api";

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
  stock?: number;
  is_active: boolean;
  category_name?: string;
  category_slug?: string;
}

function getImg(p: Product, idx = 0): string {
  const imgs = p.images && p.images.length > 0 ? p.images : p.main_image ? [p.main_image] : [];
  const img = imgs[idx] || imgs[0] || "";
  if (!img) return `https://placehold.co/600x600/fda1b7/fff?text=${encodeURIComponent(p.name_en?.slice(0, 6) || "??")}`;
  if (img.startsWith("http")) return img;
  return `${BACKEND}${img}`;
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
              setSimilar(all.filter(x => x.id !== productId).slice(0, 4));
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

  const images = product ? (product.images && product.images.length > 0 ? product.images : product.main_image ? [product.main_image] : []) : [];

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#fda1b7" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💍</div>
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: "#1a1a2e", marginBottom: 8 }}>Product not found</h2>
        <Link href="/shop" style={{ color: "#fda1b7", fontWeight: 700, textDecoration: "none" }}>← Back to Shop</Link>
      </div>
    </div>
  );

  const hasDiscount = product.old_price && product.old_price > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / product.old_price!) * 100) : 0;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* Breadcrumb */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #f5e6ea", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", fontSize: 13, color: "#888", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#fda1b7", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/shop" style={{ color: "#fda1b7", textDecoration: "none" }}>Shop</Link>
          {product.category_name && <><span>/</span><Link href={`/shop/${product.category_slug || ""}`} style={{ color: "#fda1b7", textDecoration: "none" }}>{product.category_name}</Link></>}
          <span>/</span>
          <span style={{ color: "#333" }}>{product.name_en}</span>
        </div>
      </div>

      {/* Product Section */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
        <div className="product-layout">

          {/* Images */}
          <div className="product-images">
            <div style={{ borderRadius: 20, overflow: "hidden", background: "#f9f0f3", aspectRatio: "1/1", position: "relative" }}>
              {hasDiscount && <span style={{ position: "absolute", top: 14, left: 14, background: "#ef4444", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, zIndex: 2 }}>-{discount}%</span>}
              <img
                src={getImg(product, activeImg)}
                alt={product.name_en}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/600x600/fda1b7/fff?text=??`; }}
              />
            </div>
            {images.length > 1 && (
              <div style={{ display: "flex", gap: 10, marginTop: 12, overflowX: "auto" }}>
                {images.map((img, i) => {
                  const src = img.startsWith("http") ? img : `${BACKEND}${img}`;
                  return (
                    <div key={i} onClick={() => setActiveImg(i)} style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 12, overflow: "hidden", cursor: "pointer", border: `2px solid ${activeImg === i ? "#fda1b7" : "#f0d4dc"}`, transition: "border-color 0.2s" }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="product-info">
            {product.category_name && (
              <Link href={`/shop/${product.category_slug || ""}`} style={{ fontSize: 12, fontWeight: 700, color: "#fda1b7", textTransform: "uppercase", letterSpacing: 1.5, textDecoration: "none" }}>
                {product.category_name}
              </Link>
            )}

            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "10px 0 8px", lineHeight: 1.3 }}>{product.name_en}</h1>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "#fda1b7" }}>{product.price} EGP</span>
              {hasDiscount && <span style={{ fontSize: 18, color: "#bbb", textDecoration: "line-through" }}>{product.old_price} EGP</span>}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {product.material && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#fda1b718", color: "#c97a8a", fontSize: 13, fontWeight: 700 }}>✨ {product.material}</span>}
              {product.water_resistance && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#dbeafe", color: "#1e40af", fontSize: 13, fontWeight: 700 }}>💧 {product.water_resistance}</span>}
              {product.size_info && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#f0fdf4", color: "#166534", fontSize: 13, fontWeight: 700 }}>📏 {product.size_info}</span>}
            </div>

            {product.description_en && (
              <div style={{ fontSize: 14, lineHeight: 1.8, color: "#555", marginBottom: 22, padding: "14px 16px", background: "#fdf9fb", borderRadius: 12, borderLeft: "3px solid #fda1b7" }}
                dangerouslySetInnerHTML={{ __html: product.description_en }} />
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: product.stock === 0 ? "#ef4444" : product.stock && product.stock <= 5 ? "#f59e0b" : "#22c55e" }}>
                {product.stock === 0 ? "● Out of Stock" : product.stock && product.stock <= 5 ? `● Only ${product.stock} left!` : "● In Stock"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #f0d4dc", borderRadius: 10, overflow: "hidden" }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 38, height: 46, border: "none", background: "#fff", fontSize: 18, fontWeight: 700, color: "#fda1b7", cursor: "pointer" }}>−</button>
                <span style={{ width: 40, textAlign: "center", fontWeight: 700, fontSize: 16 }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(10, q + 1))} style={{ width: 38, height: 46, border: "none", background: "#fff", fontSize: 18, fontWeight: 700, color: "#fda1b7", cursor: "pointer" }}>+</button>
              </div>
              <button onClick={handleAddToCart} disabled={product.stock === 0}
                style={{ flex: 1, height: 46, borderRadius: 10, border: "none", background: added ? "#22c55e" : "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: product.stock === 0 ? "not-allowed" : "pointer", transition: "all 0.3s" }}>
                {product.stock === 0 ? "Out of Stock" : added ? "✓ Added!" : "🛒 Add to Cart"}
              </button>
            </div>

            <Link href="/checkout" style={{ display: "block", width: "100%", padding: "14px", borderRadius: 10, border: "2px solid #fda1b7", color: "#fda1b7", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              ⚡ Buy Now
            </Link>

            <div style={{ marginTop: 20, padding: "14px 16px", background: "#fef9fb", borderRadius: 12, display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#666" }}>🚚 Free shipping above 900 EGP</span>
              <span style={{ fontSize: 13, color: "#666" }}>💳 Cash on Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {similar.length > 0 && (
        <div style={{ background: "#fdf9fb", padding: "48px 20px", borderTop: "1px solid #f5e6ea" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", marginBottom: 28, textAlign: "center" }}>Similar Products</h2>
            <div className="similar-grid">
              {similar.map(p => {
                const img = getImg(p);
                const disc = p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
                return (
                  <Link key={p.id} href={`/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(253,161,183,0.10)", transition: "transform 0.2s, box-shadow 0.2s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(253,161,183,0.20)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(253,161,183,0.10)"; }}>
                      <div style={{ position: "relative", aspectRatio: "1/1", background: "#f9f0f3" }}>
                        {disc > 0 && <span style={{ position: "absolute", top: 10, left: 10, background: "#ef4444", color: "#fff", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, zIndex: 2 }}>-{disc}%</span>}
                        <img src={img} alt={p.name_en} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x400/fda1b7/fff?text=??`; }} />
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", margin: "0 0 8px", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{p.name_en}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 800, color: "#fda1b7", fontSize: 16 }}>{p.price} EGP</span>
                          {p.old_price && p.old_price > p.price && <span style={{ fontSize: 13, color: "#bbb", textDecoration: "line-through" }}>{p.old_price} EGP</span>}
                        </div>
                        <button onClick={e => { e.preventDefault(); addToCart(p, 1); }}
                          style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
        .product-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: start;
        }
        .similar-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        @media (max-width: 768px) {
          .product-layout { grid-template-columns: 1fr; gap: 24px; }
          .similar-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
        }
      `}</style>
    </div>
  );
}
