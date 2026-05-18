"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";
const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com";

// Static categories shown instantly before API responds
const STATIC_CATEGORIES = [
  { id: "rings",           name_en: "Rings",         slug: "rings",          image: "" },
  { id: "necklace",        name_en: "Necklaces",     slug: "necklace",       image: "" },
  { id: "bracelet",        name_en: "Bracelets",     slug: "bracelet",       image: "" },
  { id: "earrings",        name_en: "Earrings",      slug: "earrings",       image: "" },
  { id: "hand-chains",     name_en: "Hand Chains",   slug: "hand-chains",    image: "" },
  { id: "sets-and-offers", name_en: "Sets & Offers", slug: "sets-and-offers",image: "" },
];

const SEED_REVIEWS = [
  { id: "s1",  customer_name: "Sara M.",    review_text: "Wallahi el khatm da te7fa! Galy fast w el shoghol na3em awy, msh shayfah 3ala edy khales. Ha2oleb tany akeed 100%", rating: 5 },
  { id: "s2",  customer_name: "Nour",       review_text: "El delivery kan super fast w el packaging 7elw awy! El 2erd elly shtrytu a7la mn el sora b kteer, colors zay ma howa", rating: 5 },
  { id: "s3",  customer_name: "Mariam A.",  review_text: "A7san 7aga eshtaretha mn zaman! El eswara sheghlet ma3aya fil ba7r w msh at2saret khales, msh sadaa2a enha lessa zay el fol", rating: 5 },
  { id: "s4",  customer_name: "Farah",      review_text: "Lazem a2olha, el customer service tab3 salma behery responsive awy w 7alet moshklty fi tawany. Shokran awy!", rating: 5 },
  { id: "s5",  customer_name: "Hedir K.",   review_text: "El ta2m kamil w be se3r mante2i awy mokarana be 7agat moshaba. Kol so7abty sa2alo 3aleh w 3arraftohom 3ala el page", rating: 5 },
  { id: "s6",  customer_name: "Yasmine",    review_text: "Ana meshtreya menhom 4 marat w kol mara a7san mn elli ablaha. El quality consistent w homa bywafro designs gdeda dyman", rating: 5 },
  { id: "s7",  customer_name: "Lamees",     review_text: "El a2rat dol 3amltahom hedya le okhty w hya etgannet bihom! El taghleef kan chic awy ka2eno mn ma7al kebeer, shokran salma", rating: 5 },
  { id: "s8",  customer_name: "Dina",       review_text: "Honestly surprised mn el quality, kont msh mota2ada bas lama galy 3'ayart ra2yi tamaman. El details mafhoma w el shaghla perfect", rating: 5 },
  { id: "s9",  customer_name: "Rana T.",    review_text: "Lebeshtom fi far7 w akhadt kteer ta3le2at! El eswara ma3 el khatm ma3 ba3d shakelhom ra2i awy. Ba2eed baneseblhom", rating: 5 },
  { id: "s10", customer_name: "Malak",      review_text: "El eswara 3amlt menha surprise le okhty w hya msh moda2a2a en da online! Kanet fakra mn ma7al. Packaging w quality top", rating: 5 },
  { id: "s11", customer_name: "Nadine",     review_text: "3andi bashra 7asa2a w 3amlt 7asaseya mn mo2awarat tanya kteer. Di lebetha esbo3en mtwasleen wala ay moshkela. A5eran la2et!", rating: 5 },
  { id: "s12", customer_name: "Rana S.",    review_text: "Kol mara bashtri hedya le nafsaha mn hena! El as3ar man2ola w el goda 3alya. 3amalt order w ga fi 3 ayam bas", rating: 5 },
  { id: "s13", customer_name: "Shereen",    review_text: "El 2oud da 3amaltah le omi fi 3eed meladha w hya 3agabha awy! 2alit zay elly betshofu fi el ma7alat el kebeera bizzabt", rating: 5 },
  { id: "s14", customer_name: "Salma K.",   review_text: "Realy msh mota2ada eny hat2ol kda bas da el wa2e3. El khatm 3amalt beih selfie w 3amly 200 like 3ala instagram lol", rating: 5 },
  { id: "s15", customer_name: "Yasmin F.",  review_text: "Garabt ashtri mn mawa2e3 tanya w mat-gebtesh zay elly eshtareetu mn hena. El goda far2 kebeer awy w se3ro arkhas kaman!", rating: 5 },
];

export default function HomePage() {
  const [currentReview, setCurrentReview] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [allReviews, setAllReviews] = useState<any[]>(SEED_REVIEWS);
  const [formName, setFormName] = useState("");
  const [formText, setFormText] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiCategories, setApiCategories] = useState<any[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [featuredSection, setFeaturedSection] = useState<{ title: string; enabled: boolean; products: any[] } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("popup_shown")) {
      const t = setTimeout(() => {
        setShowPopup(true);
        sessionStorage.setItem("popup_shown", "1");
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    // Fetch categories + featured in parallel — critical path (updates static fallback)
    Promise.all([
      fetch(`${API}/categories`).then(r => r.json()).catch(() => null),
      fetch(`${API}/settings/featured_section`).then(r => r.json()).catch(() => null),
    ]).then(async ([cats, featuredRaw]) => {
      if (Array.isArray(cats) && cats.length > 0) setApiCategories(cats);
      setCatsLoading(false);

      if (featuredRaw?.value) {
        try {
          const cfg = JSON.parse(featuredRaw.value);
          if (cfg.enabled && cfg.product_ids?.length) {
            const ids: string[] = cfg.product_ids;
            const fetched = await Promise.all(
              ids.map(id => fetch(`${API}/products/${id}`).then(r => r.json()).catch(() => null))
            );
            const picked = fetched.filter(Boolean).filter((p: any) => {
              const prod = p.product || p;
              return prod.is_active !== false;
            }).map((p: any) => p.product || p);
            if (picked.length) setFeaturedSection({ title: cfg.title || "Featured Products", enabled: true, products: picked });
          }
        } catch {}
      }
    });

    // Reviews are non-critical — load separately without blocking above
    fetch(`${API}/reviews`).then(r => r.json()).then(reviewsRaw => {
      if (reviewsRaw?.reviews?.length) {
        const seedIds = new Set(SEED_REVIEWS.map((r: any) => r.id));
        setAllReviews([...reviewsRaw.reviews, ...SEED_REVIEWS.filter((r: any) => !seedIds.has(r.id))]);
      }
    }).catch(() => {});
  }, []);

  const nextReview = () => setCurrentReview((p) => (p + 1) % allReviews.length);
  const prevReview = () => setCurrentReview((p) => (p - 1 + allReviews.length) % allReviews.length);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRating) return alert("Please select a star rating");
    setSubmitting(true);
    const optimistic = { id: `tmp-${Date.now()}`, customer_name: formName, review_text: formText, rating: formRating };
    setAllReviews(prev => [optimistic, ...prev]);
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
      if (data.review) setAllReviews(prev => prev.map(r => r.id === optimistic.id ? data.review : r));
    } catch {}
    finally { setSubmitting(false); }
  };

  return (
    <>
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
        .cat-card img { transition: transform 0.45s ease; }
        @media (hover: hover) {
          .cat-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(253,161,183,0.25) !important; }
          .cat-card:hover img { transform: scale(1.07); }
        }
        .feat-card {
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.07);
          background: #fff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #eee;
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none;
          color: #222;
        }
        @media (hover: hover) {
          .feat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(253,161,183,0.2); }
        }

        .categories-grid-inner {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        @media (max-width: 768px) {
          .categories-grid-inner {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .cat-title { font-size: 13px !important; }
          .cat-desc  { display: none !important; }
          .cat-text  { padding: 6px 8px 8px !important; }
          .cat-img   { aspect-ratio: 1/1.3 !important; }
          .hero-section { height: 60vh !important; min-height: 400px !important; }
        }

        @media (max-width: 480px) {
          .categories-grid-inner { gap: 7px; }
          .cat-title { font-size: 12px !important; }
        }
        @media (hover: hover) {
          .sparkle-img:hover { transform: scale(1.05); }
        }
      `}</style>

      {/* ── POPUP ── */}
      {showPopup && (
        <div
          onClick={() => setShowPopup(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 999999,
            background: "rgba(0,0,0,0.6)",
            display: "flex", justifyContent: "center", alignItems: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", color: "#333",
              padding: "35px 40px", borderRadius: 16,
              maxWidth: 420, width: "90%", textAlign: "center",
              fontFamily: "Arial, sans-serif", position: "relative",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              borderTop: "4px solid #fda1b7",
            }}
          >
            <button
              onClick={() => setShowPopup(false)}
              style={{
                position: "absolute", top: 15, right: 15,
                width: 32, height: 32, border: "none",
                background: "#f5f5f5", borderRadius: "50%",
                fontSize: 20, color: "#666", cursor: "pointer",
              }}
            >×</button>

            <div style={{ fontSize: 48, marginBottom: 15 }}>📦</div>

            <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 15, color: "#222" }}>
              Important Notice
            </h3>

            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#555", marginBottom: 25 }}>
              Any product that is not available on the website is considered{" "}
              <strong style={{ color: "#fda1b7" }}>Sold Out</strong>.
            </p>

            <button
              onClick={() => setShowPopup(false)}
              style={{
                background: "#fda1b7", color: "#fff", border: "none",
                padding: "12px 35px", fontSize: 16, borderRadius: 8,
                cursor: "pointer", fontWeight: 500, minWidth: 120,
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Preload hero image for fastest first paint */}
      <link rel="preload" as="image" href="/images/hero-bg.jpg" />

      {/* ── HERO ── */}
      <section
        className="hero-section"
        style={{
          width: "100%",
          height: "85vh",
          minHeight: "550px",
          maxHeight: "800px",
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
          {catsLoading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #eee", boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
              <div className="cat-img" style={{ width: "100%", aspectRatio: "3/4", background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% center", animation: "shimmer 1.2s infinite" }} />
              <div className="cat-text" style={{ padding: "10px 12px 12px", textAlign: "center" }}>
                <div style={{ height: 14, borderRadius: 7, background: "#f0f0f0", margin: "0 auto", width: "60%" }} />
              </div>
            </div>
          )) : apiCategories.map((cat) => {
            const imgUrl = cat.has_image ? `${BACKEND}/api/categories/image/${cat.id}` : null;
            return (
            <Link key={cat.id} href={`/shop/${cat.slug}`} className="cat-card" style={{
              textDecoration: "none", color: "#222", borderRadius: 20,
              boxShadow: "0 6px 20px rgba(0,0,0,0.08)", background: "#fff",
              display: "flex", flexDirection: "column", overflow: "hidden",
              border: "1px solid #eee",
            }}>
              <div className="cat-img" style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", background: "#f5e8ed", position: "relative" }}>
                {imgUrl && <img src={imgUrl} alt={cat.name_en}
                  loading="eager" decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />}
              </div>
              <div className="cat-text" style={{ background: "#fff", padding: "10px 12px 12px", flexGrow: 1, textAlign: "center" }}>
                <div className="cat-title" style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 4, letterSpacing: 0.5 }}>{cat.name_en}</div>
              </div>
            </Link>
            );
          })}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      {featuredSection && featuredSection.enabled && featuredSection.products.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 24px", background: "#fff" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8, fontFamily: "sans-serif" }}>Handpicked</p>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, color: "#1a1a2e", margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>
              {featuredSection.title}
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {featuredSection.products.map(p => {
              const img = Array.isArray(p.images) ? p.images[0] : (p.images || "");
              return (
                <Link key={p.id} href={`/products/${p.id}`} className="feat-card">
                  <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", background: "#f9f0f3" }}>
                    <img src={img} alt={p.name_en}
                      loading="lazy" decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/300x400/fdf0f3/fda1b7?text=✨`; }} />
                  </div>
                  <div style={{ padding: "10px 12px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 4, lineHeight: 1.3 }}>{p.name_en}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fda1b7" }}>{p.price} EGP</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── REVIEWS ── */}
      <section style={{ textAlign: "center", padding: "28px 20px 24px", background: "#fff", borderTop: "1px solid #eee", fontFamily: "sans-serif" }}>
        <p style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: "#fda1b7", marginBottom: 8 }}>Testimonials</p>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, marginBottom: 22, color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>
          What Our Customers Are Saying
        </h2>

        {(
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
                  <span key={star} onClick={() => setFormRating(star)}
                    onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                    style={{ fontSize: 32, color: star <= (hoverRating || formRating) ? "#fda1b7" : "#ccc", cursor: "pointer", touchAction: "manipulation" }}>★</span>
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
            <div key={s} className="sparkle-cell" style={{ overflow: "hidden", aspectRatio: "1/1", background: "#fff" }}>
              <img src={`/images/${s}.jpg`} alt={`Sparkle ${i + 1}`}
                loading="lazy" decoding="async"
                className="sparkle-img"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
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
              {apiCategories.map(c => (
                <Link key={c.id} href={`/shop/${c.slug}`} style={{ display: "block", fontSize: 12, color: "#bbb", textDecoration: "none", marginBottom: 6 }}>
                  {c.name_en}
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
          <div style={{ paddingTop: 10, textAlign: "center" }}>
            <a href="https://wa.me/201023881876" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#ccc", textDecoration: "none" }}>
              Designed by Yousef El-Sayed
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
