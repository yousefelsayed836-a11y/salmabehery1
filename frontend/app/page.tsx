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

const DEFAULT_REVIEWS = [
  { id: "d1", review_text: "Wallahi el quality 3alya gedan! el fabric na3em khaleees w el size perfect. ha order tany 100%", customer_name: "سارة", rating: 5 },
  { id: "d2", review_text: "El shipping was super fast w el customer service mo7tarma gedan. el colors a7la mn el sora bketeeer!", customer_name: "نور", rating: 5 },
  { id: "d3", review_text: "A7la purchase 3amltaha el sana di! el details mafhouma w el piece tela3et a7la mn el ma3ared.", customer_name: "مريم", rating: 5 },
  { id: "d4", review_text: "El quality 7elw awi lel price. ghasaltaha kaza mara w lessa zay el fol! ma3mletsh color wala 7aga", customer_name: "فاطمة", rating: 5 },
  { id: "d5", review_text: "Dih el makan el ba3mel meno shopping kol mara. kol mara beywafro styles gdeda w as3ar 7elwa.", customer_name: "هدير", rating: 5 },
  { id: "d6", review_text: "Ana meshtreya menhom 3 marat w kol mara bey3jboni aktar. el packaging 7elw w el delivery 3ala tool!", customer_name: "ياسمين", rating: 5 },
  { id: "d7", review_text: "El piece el gdeda di 3amltaha l fr7ty w kol s7aby sa2aloni menen. 7elw awi w quality mosh tab3eya!", customer_name: "ليلى", rating: 5 },
  { id: "d8", review_text: "Ba7eb ashtry menhom 3ashan homa wa7deen elly bywafro el styles el 3asrya di b as3ar montazama.", customer_name: "رنا", rating: 5 },
  { id: "d9", review_text: "El fabric 7elw awi w el tafseel perfect. 3amlt order w gali bokra! ma3ndhomsh delay wala 7aga", customer_name: "دينا", rating: 5 },
];




export default function HomePage() {
  const [currentReview, setCurrentReview] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [allReviews, setAllReviews] = useState(DEFAULT_REVIEWS as any[]);
  const [formName, setFormName] = useState("");
  const [formText, setFormText] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${API}/reviews`)
      .then(r => r.json())
      .then(d => { if (d.reviews && d.reviews.length > 0) setAllReviews(d.reviews); })
      .catch(() => {});
  }, []);

  const nextReview = () => setCurrentReview((p) => (p + 1) % allReviews.length);
  const prevReview = () => setCurrentReview((p) => (p - 1 + allReviews.length) % allReviews.length);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRating) return alert("Please select a rating");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: formName, review_text: formText, rating: formRating }),
      });
      const data = await res.json();
      if (data.review) setAllReviews(prev => [data.review, ...prev]);
      setFormName(""); setFormText(""); setFormRating(0);
      setSubmitted(true);
      setShowForm(false);
      setCurrentReview(0);
      setTimeout(() => setSubmitted(false), 3000);
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

        /* Desktop: 6 cards in 2 rows of 3 */
        .categories-grid-inner {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        /* Mobile: still 3 per row */
        @media (max-width: 768px) {
          .categories-grid-inner {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          .cat-title { font-size: 11px !important; }
          .cat-desc  { display: none !important; }
          .cat-text  { padding: 6px 8px 8px !important; }
          .cat-img   { aspect-ratio: 1/1.3 !important; }
          .hero-section { height: 380px !important; }
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
          height: "100vh",
          minHeight: "600px",
          maxHeight: "900px",
          backgroundImage: 'url("/images/hero-bg.jpg")',
          backgroundSize: "cover", 
          backgroundPosition: "center", 
          backgroundRepeat: "no-repeat",
          display: "flex", 
          alignItems: "flex-end", 
          justifyContent: "center",
          textAlign: "center", 
          position: "relative", 
          paddingBottom: "80px",
        }}
      >
        <div style={{ 
          position: "absolute", 
          inset: 0, 
          background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.3) 100%)", 
          pointerEvents: "none" 
        }} />
        
        <div style={{ 
          position: "relative", 
          color: "#fff", 
          maxWidth: 600, 
          padding: "0 20px", 
          textShadow: "0 2px 8px rgba(0,0,0,0.4)" 
        }}>
          <p style={{ 
            fontSize: 12, 
            letterSpacing: 5, 
            textTransform: "uppercase", 
            marginBottom: 10, 
            opacity: 0, 
            animation: "fadeUp 0.8s ease 0.2s forwards", 
            color: "#ffd6e0" 
          }}>
            ✦ Salma Behery ✦
          </p>
          <h1 style={{ 
            fontSize: 36, 
            marginBottom: 16, 
            fontWeight: 300, 
            letterSpacing: 2, 
            opacity: 0, 
            animation: "fadeUp 0.8s ease 0.5s forwards", 
            lineHeight: 1.2,
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          }}>
            Elegant Jewelry<br/>Collection
          </h1>
          <p style={{ 
            fontSize: 15, 
            marginBottom: 28, 
            opacity: 0, 
            animation: "fadeUp 0.8s ease 0.8s forwards", 
            color: "#ffe4ec",
            fontWeight: 300,
          }}>
            Discover timeless pieces crafted to shine with your style.
          </p>
          <Link href="/shop" style={{
            display: "inline-block", 
            background: "rgba(255,255,255,0.15)", 
            backdropFilter: "blur(10px)",
            color: "#fff", 
            padding: "14px 40px", 
            borderRadius: 50, 
            textDecoration: "none",
            fontWeight: 500, 
            fontSize: 14, 
            opacity: 0, 
            animation: "fadeUp 0.8s ease 1.1s forwards",
            border: "1px solid rgba(255,255,255,0.3)",
            letterSpacing: 1,
            transition: "all 0.3s ease",
          }}>
            Shop Now →
          </Link>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 52px", background: "#fff" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8, fontFamily: "sans-serif" }}>Collections</p>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
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
      <section style={{ textAlign: "center", padding: "52px 20px", background: "#fff", borderTop: "1px solid #eee", fontFamily: "sans-serif" }}>
        <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8 }}>Testimonials</p>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 500, marginBottom: 30, color: "#333" }}>
          What Our Customers Are Saying
        </h2>

        {/* Review Box */}
        <div style={{ background: "#f2f2f2", width: 340, aspectRatio: "1/1", margin: "0 auto", padding: 25, borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "center", transition: "all 0.3s ease" }}>
          <p style={{ fontSize: 17, color: "#333", marginBottom: 15, lineHeight: 1.6, direction: "rtl" }}>
            "{allReviews[currentReview]?.review_text || allReviews[currentReview]?.text}"
          </p>
          <div style={{ fontSize: 14, color: "#777", marginBottom: 10, fontWeight: 600 }}>
            - {allReviews[currentReview]?.customer_name || allReviews[currentReview]?.name}
          </div>
          <div style={{ color: "#fda1b7", fontSize: 25 }}>
            {"★".repeat(allReviews[currentReview]?.rating || allReviews[currentReview]?.stars || 5)}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 15 }}>
          <button onClick={prevReview} style={{ background: "#fda1b7", color: "white", border: "none", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer", transition: "all 0.3s ease" }}>❮</button>
          <button onClick={nextReview} style={{ background: "#fda1b7", color: "white", border: "none", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer", transition: "all 0.3s ease" }}>❯</button>
        </div>

        {/* Dots */}
        <div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 8 }}>
          {allReviews.map((_, i) => (
            <span key={i} onClick={() => setCurrentReview(i)}
              style={{ width: 10, height: 10, borderRadius: "50%", background: i === currentReview ? "#fda1b7" : "#ddd", cursor: "pointer", display: "inline-block", transition: "all 0.3s ease" }} />
          ))}
        </div>

        {submitted && (
          <div style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 600, fontSize: 14, display: "inline-block" }}>
            ✅ Thank you for your review! ❤️
          </div>
        )}

        {/* Add Review Button */}
        <button onClick={() => setShowForm(s => !s)}
          style={{ marginTop: 25, background: "#fda1b7", color: "white", border: "none", padding: "14px 28px", fontSize: 16, borderRadius: 8, cursor: "pointer", transition: "all 0.3s ease" }}>
          Add Your Review
        </button>

        {/* Form */}
        {showForm && (
          <div style={{ marginTop: 35, background: "#fafafa", padding: 25, borderRadius: 12, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            <h3 style={{ marginBottom: 20, color: "#333" }}>Share Your Experience</h3>
            <form onSubmit={submitReview}>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Your Name" required
                style={{ width: "100%", maxWidth: 340, padding: 12, margin: "8px 0", border: "1px solid #ddd", borderRadius: 6, fontFamily: "inherit", fontSize: 14, boxSizing: "border-box" }} />
              <textarea value={formText} onChange={e => setFormText(e.target.value)} placeholder="Write your review..." required rows={4}
                style={{ width: "100%", maxWidth: 340, padding: 12, margin: "8px 0", border: "1px solid #ddd", borderRadius: 6, fontFamily: "inherit", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
              {/* Stars */}
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
          </div>
        )}
      </section>

      {/* ── YOUR EVERYDAY SPARKLE ── */}
      <section style={{ padding: "52px 16px", textAlign: "center", background: "#fff", borderTop: "1px solid #eee" }}>
        <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8, fontFamily: "sans-serif" }}>Instagram</p>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 600, marginBottom: 28, color: "#1a1a2e" }}>
          Your everyday sparkle ✨
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
              <img src="https://assets.wuiltstore.com/cmmghekwr0oa601k44qqgca21__D8_AA_D8_B5_D9_85_D9_8A_D9_85__D8_A8_D8_AF_D9_88_D9_86__D8_B9_D9_86_D9_88_D8_A7_D9_86__2_.webp"
                alt="Salma Behery" style={{ height: 36, marginBottom: 10, display: "block" }} />
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "#bbb", margin: 0 }}>Handcrafted jewelry. Free shipping 900+ EGP.</p>
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#fda1b7", marginBottom: 10 }}>Shop</p>
              {CATEGORY_CARDS.map(c => (
                <Link key={c.key} href={c.href} style={{ display: "block", fontSize: 12, color: "#bbb", textDecoration: "none", marginBottom: 6 }}
                >
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
