"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

const CATEGORY_CARDS = [
  {
    key: "rings",
    title: "Rings",
    desc: "Colorful gemstone rings.",
    image: "/images/rings.jpg",
    href: "/shop/rings",
    emoji: "💍",
  },
  {
    key: "hand-chains",
    title: "Hand Chains",
    desc: "Elegant hand chains.",
    image: "/images/hand-chains.jpg",
    href: "/shop/hand-chains",
    emoji: "✨",
  },
  {
    key: "bracelets",
    title: "Bracelets",
    desc: "Premium bracelets.",
    image: "/images/bracelets.jpg",
    href: "/shop/bracelet",
    emoji: "🌸",
  },
  {
    key: "necklaces",
    title: "Necklaces",
    desc: "Luxury necklaces.",
    image: "/images/necklaces.jpg",
    href: "/shop/necklace",
    emoji: "📿",
  },
  {
    key: "earrings",
    title: "Earrings",
    desc: "Delicate earrings.",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=500&fit=crop",
    href: "/shop/earrings",
    emoji: "🌙",
  },
  {
    key: "sets-and-offers",
    title: "Sets & Offers",
    desc: "Special sets & deals.",
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=500&fit=crop",
    href: "/shop/sets-and-offers",
    emoji: "💫",
  },
];

const BASE_COUNT = 136;

export default function HomePage() {
  const [currentReview, setCurrentReview] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [formName, setFormName] = useState("");
  const [formText, setFormText] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Show cached reviews instantly while backend wakes up
    try {
      const cached = localStorage.getItem("cached_reviews");
      if (cached) setAllReviews(JSON.parse(cached));
    } catch {}

    // Fetch fresh from backend in background
    fetch(`${API}/reviews`)
      .then(r => r.json())
      .then(d => {
        if (d.reviews && d.reviews.length > 0) {
          setAllReviews(d.reviews);
          try { localStorage.setItem("cached_reviews", JSON.stringify(d.reviews)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const reviewCount = BASE_COUNT + allReviews.length;
  const nextReview = () => setCurrentReview((p) => (p + 1) % allReviews.length);
  const prevReview = () => setCurrentReview((p) => (p - 1 + allReviews.length) % allReviews.length);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRating) return alert("Please select a star rating");
    setSubmitting(true);
    // Show review immediately in UI
    const optimistic = { id: `tmp-${Date.now()}`, customer_name: formName, review_text: formText, rating: formRating };
    setAllReviews(prev => {
      const updated = [optimistic, ...prev];
      try { localStorage.setItem("cached_reviews", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setCurrentReview(0);
    setFormName(""); setFormText(""); setFormRating(0);
    setSubmitted(true);
    setShowForm(false);
    setTimeout(() => setSubmitted(false), 3000);
    try {
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: optimistic.customer_name, review_text: optimistic.review_text, rating: optimistic.rating }),
      });
      const data = await res.json();
      if (data.review) {
        setAllReviews(prev => {
          const updated = prev.map(r => r.id === optimistic.id ? data.review : r);
          try { localStorage.setItem("cached_reviews", JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    } catch {}
    finally { setSubmitting(false); }
  };

  return (
    <>
      <Head>
        <title>Salma Behery — Premium Jewelry Collection</title>
        <meta name="description" content="Premium Jewelry. Free Shipping above 900 EGP, Cash on Delivery." />
      </Head>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .cat-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .cat-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(253,161,183,0.25) !important; }
        .cat-card:hover img { transform: scale(1.07); }
        .cat-card img { transition: transform 0.45s ease; }

        .categories-grid-inner {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        @media (max-width: 768px) {
          .categories-grid-inner {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          .cat-title { font-size: 11px !important; }
          .cat-desc  { display: none !important; }
          .cat-text  { padding: 6px 8px 8px !important; }
          .cat-img   { aspect-ratio: 1/1.3 !important; }
          .hero-section { height: 60vh !important; min-height: 400px !important; }
        }

        @media (max-width: 480px) {
          .categories-grid-inner { gap: 7px; }
          .cat-title { font-size: 10px !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section
        className="hero-section"
        style={{
          width: "100%", 
          height: "75vh",
          minHeight: "500px",
          maxHeight: "700px",
          backgroundImage: 'url("/images/hero-bg.jpg")',
          backgroundSize: "cover", 
          backgroundPosition: "center", 
          backgroundRepeat: "no-repeat",
          display: "flex", 
          alignItems: "flex-end", 
          justifyContent: "center",
          textAlign: "center", 
          position: "relative", 
          paddingBottom: "60px",
        }}
      >
        <div style={{ 
          position: "absolute", 
          inset: 0, 
          background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)", 
          pointerEvents: "none" 
        }} />
        
        <div style={{ 
          position: "relative", 
          padding: "0 20px",
        }}>
          <Link href="/shop" style={{
            display: "inline-block", 
            background: "rgba(255,255,255,0.2)", 
            backdropFilter: "blur(10px)",
            color: "#fff", 
            padding: "16px 48px", 
            borderRadius: 50, 
            textDecoration: "none",
            fontWeight: 500, 
            fontSize: 15, 
            border: "1px solid rgba(255,255,255,0.4)",
            letterSpacing: 2,
            textTransform: "uppercase",
            transition: "all 0.3s ease",
          }}>
            Shop Now
          </Link>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 24px", background: "#fff" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8, fontFamily: "sans-serif" }}>Collections</p>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, color: "#1a1a2e", margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>
            Shop By Category
          </h2>
        </div>

        <div className="categories-grid-inner">
          {CATEGORY_CARDS.map((cat) => (
            <Link key={cat.key} href={cat.href} className="cat-card" style={{
              textDecoration: "none", color: "#222", borderRadius: 20,
              boxShadow: "0 6px 20px rgba(0,0,0,0.08)", background: "#fff",
              display: "flex", flexDirection: "column", overflow: "hidden",
              border: "1px solid #eee",
            }}>
              <div className="cat-img" style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", background: "#fff", position: "relative" }}>
                <img src={cat.image} alt={cat.title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
                  onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x500/fdf0f3/fda1b7?text=${cat.emoji}`; }} />
              </div>
              <div className="cat-text" style={{ background: "#fff", padding: "10px 12px 12px", flexGrow: 1, textAlign: "center" }}>
                <div className="cat-title" style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>{cat.title}</div>
                <div className="cat-desc" style={{ fontSize: 13, color: "#999", lineHeight: 1.5 }}>{cat.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section style={{ textAlign: "center", padding: "28px 20px 24px", background: "#fff", borderTop: "1px solid #eee", fontFamily: "sans-serif" }}>
        <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8 }}>Testimonials</p>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, marginBottom: 6, color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>
          What Our Customers Are Saying
        </h2>

        {/* Counter */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fef4f7", border: "1px solid #fda1b7", borderRadius: 30, padding: "6px 18px", marginBottom: 22 }}>
          <span style={{ color: "#fda1b7", fontSize: 16 }}>★</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{reviewCount.toLocaleString()}</span>
          <span style={{ fontSize: 13, color: "#888" }}>happy customers</span>
        </div>

        {allReviews.length === 0 ? (
          <div style={{ background: "#f9f9f9", maxWidth: 480, margin: "0 auto", padding: "32px 28px", borderRadius: 12, color: "#aaa", fontSize: 15 }}>
            Be the first to leave a review!
          </div>
        ) : (
          <>
            <div style={{ background: "#f2f2f2", maxWidth: 480, margin: "0 auto", padding: "24px 28px", borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "center", transition: "all 0.3s ease" }}>
              <p style={{ fontSize: 17, color: "#333", marginBottom: 15, lineHeight: 1.6, direction: "rtl" }}>
                "{allReviews[currentReview]?.review_text || allReviews[currentReview]?.text}"
              </p>
              <div style={{ fontSize: 14, color: "#777", marginBottom: 10, fontWeight: 600 }}>
                — {allReviews[currentReview]?.customer_name || allReviews[currentReview]?.name}
              </div>
              <div style={{ color: "#fda1b7", fontSize: 22 }}>
                {"★".repeat(allReviews[currentReview]?.rating || allReviews[currentReview]?.stars || 5)}
              </div>
            </div>

            <div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 15 }}>
              <button onClick={prevReview} style={{ background: "#fda1b7", color: "white", border: "none", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer" }}>❮</button>
              <button onClick={nextReview} style={{ background: "#fda1b7", color: "white", border: "none", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer" }}>❯</button>
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>
              {allReviews.slice(0, 10).map((_, i) => (
                <span key={i} onClick={() => setCurrentReview(i)}
                  style={{ width: 9, height: 9, borderRadius: "50%", background: i === currentReview ? "#fda1b7" : "#ddd", cursor: "pointer", display: "inline-block", transition: "background 0.2s" }} />
              ))}
            </div>
          </>
        )}

        {submitted && (
          <div style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 600, fontSize: 14, display: "inline-block" }}>
            Thank you for your review!
          </div>
        )}

        <button onClick={() => setShowForm(s => !s)}
          style={{ marginTop: 22, background: "#fda1b7", color: "white", border: "none", padding: "13px 28px", fontSize: 15, borderRadius: 8, cursor: "pointer", transition: "all 0.3s ease" }}>
          {showForm ? "Cancel" : "Add Your Review"}
        </button>

        {showForm && (
          <div style={{ marginTop: 28, background: "#fafafa", padding: 25, borderRadius: 12, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            <h3 style={{ marginBottom: 20, color: "#333", fontFamily: "'Inter', sans-serif" }}>Share Your Experience</h3>
            <form onSubmit={submitReview}>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Your Name" required
                style={{ width: "100%", padding: 12, margin: "8px 0", border: "1px solid #ddd", borderRadius: 6, fontFamily: "inherit", fontSize: 14, boxSizing: "border-box" }} />
              <textarea value={formText} onChange={e => setFormText(e.target.value)} placeholder="Write your review..." required rows={4}
                style={{ width: "100%", padding: 12, margin: "8px 0", border: "1px solid #ddd", borderRadius: 6, fontFamily: "inherit", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
              <div style={{ display: "flex", justifyContent: "center", margin: "14px 0", gap: 6 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} onClick={() => setFormRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                    style={{ fontSize: 32, color: star <= (hoverRating || formRating) ? "#fda1b7" : "#ccc", cursor: "pointer", transition: "color 0.15s" }}>★</span>
                ))}
              </div>
              <button type="submit" disabled={submitting}
                style={{ width: "100%", background: "#fda1b7", color: "white", border: "none", padding: "12px 24px", borderRadius: 6, cursor: "pointer", fontSize: 15, marginTop: 8, opacity: submitting ? 0.7 : 1, fontWeight: 600 }}>
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        )}
      </section>

      {/* ── YOUR EVERYDAY SPARKLE ── */}
      <section style={{ padding: "28px 16px 24px", textAlign: "center", background: "#fff", borderTop: "1px solid #eee" }}>
        <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8, fontFamily: "sans-serif" }}>Instagram</p>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, marginBottom: 24, color: "#1a1a2e", letterSpacing: 2, textTransform: "uppercase" }}>
          Your everyday sparkle
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 3, maxWidth: 680, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(253,161,183,0.15)" }}>
          {["sparkle-1", "sparkle-2", "sparkle-3", "sparkle-4"].map((s, i) => (
            <div key={s} style={{ overflow: "hidden", aspectRatio: "1/1", background: "#fff" }}>
              <img src={`/images/${s}.jpg`} alt={`Sparkle ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
                onMouseEnter={e => (e.target as HTMLImageElement).style.transform = "scale(1.05)"}
                onMouseLeave={e => (e.target as HTMLImageElement).style.transform = "scale(1)"}
                onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/340x340/fdf0f3/fda1b7?text=✨`; }} />
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: "#bbb" }}>@salmabehery</p>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#fff", borderTop: "1px solid #f0e0e6", padding: "24px 24px 16px", color: "#aaa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#1a1a2e",
                letterSpacing: 3,
                textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
                marginBottom: 10,
              }}>
                Salma Behery
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "#bbb", margin: 0 }}>Handcrafted jewelry. Free shipping 900+ EGP.</p>
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#fda1b7", marginBottom: 10 }}>Shop</p>
              {CATEGORY_CARDS.map(c => (
                <Link key={c.key} href={c.href} style={{ display: "block", fontSize: 12, color: "#bbb", textDecoration: "none", marginBottom: 6 }}>
                  {c.title}
                </Link>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#fda1b7", marginBottom: 10 }}>Help</p>
              {[["Shipping Info", "/shipping"], ["Returns", "/returns"], ["Contact Us", "/contact"]].map(([label, href]) => (
                <Link key={href} href={href} style={{ display: "block", fontSize: 12, color: "#bbb", textDecoration: "none", marginBottom: 6 }}>{label}</Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #f0e0e6", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#ccc", letterSpacing: 1 }}>© 2026 SALMA BEHERY</p>
            <p style={{ margin: 0, fontSize: 11, color: "#ccc" }}>💵 COD &nbsp;|&nbsp; 🚚 Free Shipping 900+ EGP</p>
          </div>
        </div>
      </footer>
    </>
  );
}
