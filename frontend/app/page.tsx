"use client";

import { useState } from "react";
import Head from "next/head";
import Link from "next/link";

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

const REVIEWS = [
  { text: "Wallahi el quality 3alya gedan! el fabric na3em khaleees w el size perfect. ha order tany 100%", name: "سارة", stars: 5 },
  { text: "El shipping was super fast w el customer service mo7tarma gedan. el colors a7la mn el sora bketeeer!", name: "نور", stars: 5 },
  { text: "A7la purchase 3amltaha el sana di! el details mafhouma w el piece tela3et a7la mn el ma3ared.", name: "مريم", stars: 5 },
  { text: "El quality 7elw awi lel price. ghasaltaha kaza mara w lessa zay el fol! ma3mletsh color wala 7aga", name: "فاطمة", stars: 5 },
  { text: "Dih el makan el ba3mel meno shopping kol mara. kol mara beywafro styles gdeda w as3ar 7elwa.", name: "هدير", stars: 5 },
  { text: "Ana meshtreya menhom 3 marat w kol mara bey3jboni aktar. el packaging 7elw w el delivery 3ala tool!", name: "ياسمين", stars: 5 },
  { text: "El piece el gdeda di 3amltaha l fr7ty w kol s7aby sa2aloni menen. 7elw awi w quality mosh tab3eya!", name: "ليلى", stars: 5 },
  { text: "Ba7eb ashtry menhom 3ashan homa wa7deen elly bywafro el styles el 3asrya di b as3ar montazama.", name: "رنا", stars: 5 },
  { text: "El fabric 7elw awi w el tafseel perfect. 3amlt order w gali bokra! ma3ndhomsh delay wala 7aga", name: "دينا", stars: 5 },
];




export default function HomePage() {
  const [currentReview, setCurrentReview] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [allReviews, setAllReviews] = useState(REVIEWS);
  const [newReview, setNewReview] = useState({ text: "", name: "" });
  const [submitted, setSubmitted] = useState(false);

  const nextReview = () => setCurrentReview((p) => (p + 1) % allReviews.length);
  const prevReview = () => setCurrentReview((p) => (p - 1 + allReviews.length) % allReviews.length);

  const submitReview = () => {
    if (!newReview.text.trim() || !newReview.name.trim()) return;
    const review = { text: newReview.text.trim(), name: newReview.name.trim(), stars: 5 };
    setAllReviews(prev => [review, ...prev]);
    setNewReview({ text: "", name: "" });
    setSubmitted(true);
    setShowForm(false);
    setCurrentReview(0);
    setTimeout(() => setSubmitted(false), 3000);
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
          width: "100%", height: "520px",
          backgroundImage: 'url("/images/hero-bg.jpg")',
          backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          textAlign: "center", position: "relative", paddingBottom: "60px",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05))", pointerEvents: "none" }} />
        <div style={{ position: "relative", color: "#fff", maxWidth: 600, padding: "0 20px", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
          <p style={{ fontSize: 12, letterSpacing: 5, textTransform: "uppercase", marginBottom: 10, opacity: 0, animation: "fadeUp 0.8s ease 0.2s forwards", color: "#ffd6e0" }}>
            ✦ Salma Behery ✦
          </p>
          <h1 style={{ fontSize: 30, marginBottom: 12, fontWeight: 700, letterSpacing: 1, opacity: 0, animation: "fadeUp 0.8s ease 0.5s forwards", lineHeight: 1.3 }}>
            Elegant Jewelry Collection
          </h1>
          <p style={{ fontSize: 14, marginBottom: 24, opacity: 0, animation: "fadeUp 0.8s ease 0.8s forwards", color: "#ffe4ec" }}>
            Discover timeless pieces crafted to shine with your style.
          </p>
          <Link href="/shop" style={{
            display: "inline-block", background: "linear-gradient(135deg, #fda1b7, #ff8fa3)",
            color: "#fff", padding: "13px 36px", borderRadius: 50, textDecoration: "none",
            fontWeight: 700, fontSize: 14, opacity: 0, animation: "fadeUp 0.8s ease 1.1s forwards",
            boxShadow: "0 8px 24px rgba(253,161,183,0.4)",
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
      <section style={{ textAlign: "center", padding: "52px 20px", background: "#fff", borderTop: "1px solid #eee" }}>
        <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8, fontFamily: "sans-serif" }}>Testimonials</p>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 600, marginBottom: 32, color: "#1a1a2e" }}>
          What Our Customers Say
        </h2>

        <div style={{
          background: "#fff", border: "1.5px solid #fde8ee",
          width: 340, maxWidth: "90%", aspectRatio: "1/1", margin: "0 auto",
          padding: 28, borderRadius: 20, display: "flex", flexDirection: "column",
          justifyContent: "center", boxShadow: "0 8px 32px rgba(253,161,183,0.12)", transition: "all 0.3s ease",
        }}>
          <div style={{ color: "#fda1b7", fontSize: 22, marginBottom: 14, letterSpacing: 3 }}>{"★".repeat(allReviews[currentReview].stars)}</div>
          <p style={{ fontSize: 15, color: "#444", marginBottom: 16, lineHeight: 1.7, direction: "rtl", fontStyle: "italic" }}>
            "{allReviews[currentReview].text}"
          </p>
          <div style={{ fontSize: 14, color: "#fda1b7", fontWeight: 700 }}>— {allReviews[currentReview].name}</div>
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 12 }}>
          {[prevReview, nextReview].map((fn, i) => (
            <button key={i} onClick={fn} style={{
              background: "#fda1b7", color: "#fff", border: "none",
              width: 40, height: 40, borderRadius: "50%", fontSize: 16, cursor: "pointer", transition: "all 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f78fa3"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fda1b7"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}>
              {i === 0 ? "❮" : "❯"}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 6 }}>
          {allReviews.map((_, i) => (
            <button key={i} onClick={() => setCurrentReview(i)} style={{
              width: i === currentReview ? 20 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer",
              background: i === currentReview ? "#fda1b7" : "#f0d4dc", transition: "all 0.3s ease", padding: 0,
            }} />
          ))}
        </div>

        {/* ✅ Success toast */}
        {submitted && (
          <div style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 600, fontSize: 14, display: "inline-block" }}>
            ✅ Your review has been added!
          </div>
        )}

        {submitted && (
          <div style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 600, fontSize: 14, display: "inline-block" }}>
            ✅ Your review has been added!
          </div>
        )}

        {/* Add Review */}
        <div style={{ marginTop: 32 }}>
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: "12px 28px", borderRadius: 50, border: "1.5px solid #fda1b7",
            background: "#fff", color: "#fda1b7", fontWeight: 700, cursor: "pointer", fontSize: 14, transition: "all 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fda1b7"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = "#fda1b7"; }}>
            ✍️ Add Your Review
          </button>

          {showForm && (
            <div style={{ maxWidth: 400, margin: "20px auto 0", padding: 24, borderRadius: 16, border: "1px solid #fde8ee", background: "#fff", boxShadow: "0 4px 20px rgba(253,161,183,0.1)" }}>
              <textarea value={newReview.text} onChange={e => setNewReview(p => ({ ...p, text: e.target.value }))} placeholder="Share your experience..." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #f0d4dc", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
              <input value={newReview.name} onChange={e => setNewReview(p => ({ ...p, name: e.target.value }))} placeholder="Your name" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #f0d4dc", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
              <button onClick={submitReview} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Submit Review ✓
              </button>
            </div>
          )}
        </div>
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
