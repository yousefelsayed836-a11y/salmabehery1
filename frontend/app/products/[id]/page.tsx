"use client";

import { useState, useEffect, useCallback } from "react";
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

interface Review {
  id: string;
  customer_name: string;
  review_text: string;
  rating: number;
  created_at: string;
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

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentReview, setCurrentReview] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formText, setFormText] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [thankYou, setThankYou] = useState(false);

  useEffect(() => {
    if (!productId) return;
    fetch(`${API}/products/${productId}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setProduct(d.product || d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`${API}/reviews?product_id=${productId}`)
      .then(r => r.json())
      .then(d => { if (d.reviews) setReviews(d.reviews); })
      .catch(() => {});
  }, [productId]);

  const addToCart = () => {
    if (!product) return;
    const img = getImg(product);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const idx = cart.findIndex((i: any) => i.product.id === product.id);
    if (idx >= 0) cart[idx].qty = Math.min(10, cart[idx].qty + qty);
    else cart.push({ product: { id: product.id, name_en: product.name_en, price: product.price, image_url: img }, qty, size: product.size_info || "One Size" });
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRating) return alert("Please select a rating");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, customer_name: formName, review_text: formText, rating: formRating }),
      });
      const data = await res.json();
      if (data.review) {
        setReviews(prev => [data.review, ...prev]);
        setCurrentReview(0);
      }
      setFormName(""); setFormText(""); setFormRating(0);
      setThankYou(true);
      setTimeout(() => { setThankYou(false); setShowForm(false); }, 3000);
    } catch {}
    finally { setSubmitting(false); }
  };

  const allReviews = reviews.length > 0 ? reviews : [
    { id: "s1", customer_name: "سارة", review_text: "Wallahi el quality 3alya gedan! el fabric na3em khaleees w el size perfect. ha order tany 100%", rating: 5, created_at: "" },
    { id: "s2", customer_name: "نور", review_text: "El shipping was super fast w el customer service mo7tarma gedan. el colors a7la mn el sora bketeeer!", rating: 5, created_at: "" },
    { id: "s3", customer_name: "مريم", review_text: "A7la purchase 3amltaha el sana di! el details mafhouma w el piece tela3et a7la mn el ma3ared. worth kol penny!", rating: 5, created_at: "" },
    { id: "s4", customer_name: "فاطمة", review_text: "El quality 7elw awi lel price. ghasaltaha kaza mara w lessa zay el fol!", rating: 5, created_at: "" },
    { id: "s5", customer_name: "هدير", review_text: "Dih el makan el ba3mel meno shopping kol mara. kol mara beywafro styles gdeda w as3ar 7elwa!", rating: 5, created_at: "" },
  ];

  const rev = allReviews[currentReview] || allReviews[0];
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

            {allReviews.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ color: "#fda1b7", fontSize: 16 }}>{"★".repeat(5)}</span>
                <span style={{ fontSize: 13, color: "#888" }}>({allReviews.length} reviews)</span>
              </div>
            )}

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
              <button onClick={addToCart} disabled={product.stock === 0}
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

      {/* Reviews Section */}
      <div style={{ background: "#fff", padding: "40px 20px", borderTop: "1px solid #f5e6ea" }}>
        <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", fontFamily: "sans-serif" }}>

          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 500, marginBottom: 30, color: "#333" }}>
            What Our Customers Are Saying
          </h2>

          {/* Review Box */}
          <div style={{ background: "#f2f2f2", width: 340, aspectRatio: "1/1", margin: "0 auto", padding: 25, borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "center", transition: "all 0.3s ease" }}>
            <p style={{ fontSize: 17, color: "#333", marginBottom: 15, lineHeight: 1.6, direction: "rtl" }}>"{rev.review_text}"</p>
            <div style={{ fontSize: 14, color: "#777", marginBottom: 10, fontWeight: 600 }}>- {rev.customer_name}</div>
            <div style={{ color: "#fda1b7", fontSize: 25 }}>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</div>
          </div>

          {/* Navigation */}
          <div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 15 }}>
            <button onClick={() => setCurrentReview(i => (i - 1 + allReviews.length) % allReviews.length)}
              style={{ background: "#fda1b7", color: "white", border: "none", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer", transition: "all 0.3s ease" }}>❮</button>
            <button onClick={() => setCurrentReview(i => (i + 1) % allReviews.length)}
              style={{ background: "#fda1b7", color: "white", border: "none", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer", transition: "all 0.3s ease" }}>❯</button>
          </div>

          {/* Dots */}
          <div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 8 }}>
            {allReviews.map((_, i) => (
              <span key={i} onClick={() => setCurrentReview(i)}
                style={{ width: 10, height: 10, borderRadius: "50%", background: i === currentReview ? "#fda1b7" : "#ddd", cursor: "pointer", display: "inline-block", transition: "all 0.3s ease" }} />
            ))}
          </div>

          {/* Add Review Button */}
          <button onClick={() => setShowForm(s => !s)}
            style={{ marginTop: 25, background: "#fda1b7", color: "white", border: "none", padding: "14px 28px", fontSize: 16, borderRadius: 8, cursor: "pointer", transition: "all 0.3s ease" }}>
            Add Your Review
          </button>

          {/* Review Form */}
          {showForm && (
            <div style={{ marginTop: 35, background: "#fafafa", padding: 25, borderRadius: 12, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
              <h3 style={{ marginBottom: 20, color: "#333" }}>Share Your Experience</h3>

              {thankYou ? (
                <p style={{ color: "#28a745", fontWeight: "bold", fontSize: 16 }}>Thank you for your review ❤️</p>
              ) : (
                <form onSubmit={submitReview}>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Your Name" required
                    style={{ width: "100%", maxWidth: 340, padding: 12, margin: "8px 0", border: "1px solid #ddd", borderRadius: 6, fontFamily: "inherit", fontSize: 14, boxSizing: "border-box" }} />

                  <textarea value={formText} onChange={e => setFormText(e.target.value)} placeholder="Write your review..." required rows={4}
                    style={{ width: "100%", maxWidth: 340, padding: 12, margin: "8px 0", border: "1px solid #ddd", borderRadius: 6, fontFamily: "inherit", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />

                  {/* Star Rating */}
                  <div style={{ display: "flex", flexDirection: "row-reverse", justifyContent: "center", margin: "15px 0", gap: 4 }}>
                    {[5, 4, 3, 2, 1].map(star => (
                      <span key={star} onClick={() => setFormRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                        style={{ fontSize: 30, color: star <= (hoverRating || formRating) ? "#fda1b7" : "#ccc", cursor: "pointer", padding: "0 3px", transition: "color 0.2s" }}>★</span>
                    ))}
                  </div>

                  <button type="submit" disabled={submitting}
                    style={{ background: "#fda1b7", color: "white", border: "none", padding: "12px 24px", borderRadius: 6, cursor: "pointer", fontSize: 16, marginTop: 10, opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .product-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: start;
        }
        .product-images {}
        .product-info {}
        @media (max-width: 768px) {
          .product-layout { grid-template-columns: 1fr; gap: 24px; }
        }
      `}</style>
    </div>
  );
}
