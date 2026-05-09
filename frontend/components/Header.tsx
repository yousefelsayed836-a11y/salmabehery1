"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';

interface Product {
  id: string;
  name_en: string;
  price: number;
  main_image?: string;
  images?: string[];
  handle?: string;
  category_name?: string;
}

const API_BASE = "http://localhost:5000/api";

function getImg(p: Product) {
  const img = p.main_image || (p.images && p.images[0]);
  if (!img) return null;
  if (img.startsWith("http")) return img;
  return `http://localhost:5000${img}`;
}

const NAV_LINKS = [
  { label: "Shop",        href: "/shop" },
  { label: "Rings",       href: "/shop/rings" },
  { label: "Necklaces",   href: "/shop/necklace" },
  { label: "Bracelets",   href: "/shop/bracelet" },
  { label: "Earrings",    href: "/shop/earrings" },
  { label: "Sets & Offers", href: "/shop/sets-and-offers" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  // Cart count
  useEffect(() => {
    const update = () => {
      try {
        const saved = localStorage.getItem('cart');
        if (saved) {
          const items = JSON.parse(saved);
          setCartCount(items.reduce((s: number, i: any) => s + (i.qty || 0), 0));
        } else setCartCount(0);
      } catch {}
    };
    update();
    window.addEventListener('cartUpdated', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('cartUpdated', update); window.removeEventListener('storage', update); };
  }, []);

  // Close dropdown outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Live search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/products?search=${encodeURIComponent(q)}&is_active=true&limit=8`, { cache: "no-store" });
      const data = await res.json();
      setResults(data.products || []);
      setShowDropdown(true);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); setShowDropdown(false); return; }
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setShowDropdown(false);
      router.push(`/shop?search=${encodeURIComponent(query)}`);
    }
    if (e.key === 'Escape') { setShowDropdown(false); setQuery(''); }
  };

  if (isDashboard) return null;

  return (
    <>
      {/* ✅ Ticker - Free Shipping فقط + خلفية وردية فاتحة */}
      <div style={{
        background: "#fda1b7",
        overflow: "hidden",
        padding: "9px 0",
        position: "sticky",
        top: 0,
        zIndex: 101,
      }}>
        <div style={{ display: "flex", width: "200%", animation: "tickerScroll 22s linear infinite" }}>
          {[1, 2].map(k => (
            <div key={k} style={{ flex: "0 0 50%", display: "flex", justifyContent: "space-around" }}>
              {[
                "🚚 Free Shipping on orders above 900 EGP",
                "🚚 Free Shipping on orders above 900 EGP",
                "🚚 Free Shipping on orders above 900 EGP",
                "🚚 Free Shipping on orders above 900 EGP",
                "🚚 Free Shipping on orders above 900 EGP",
              ].map((t, i) => (
                <span key={i} style={{ color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: 1.5, whiteSpace: "nowrap", padding: "0 40px" }}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Header - خلفية بيضاء */}
      <header style={{
        position: "sticky",
        top: "38px",
        zIndex: 100,
        background: "#fff",
        borderBottom: "1px solid #f5e6ea",
        boxShadow: "0 2px 12px rgba(253,161,183,0.08)",
        padding: "10px 24px",
      }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <img
              src="https://assets.wuiltstore.com/cmmghekwr0oa601k44qqgca21__D8_AA_D8_B5_D9_85_D9_8A_D9_85__D8_A8_D8_AF_D9_88_D9_86__D8_B9_D9_86_D9_88_D8_A7_D9_86__2_.webp"
              alt="Salma Behery"
              style={{ height: 46, width: "auto" }}
            />
          </Link>

          {/* Search */}
          <div ref={searchRef} style={{ flex: 1, maxWidth: 520, position: "relative", margin: "0 auto" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#fda1b7", pointerEvents: "none" }}>🔍</span>
              <input
                type="text"
                value={query}
                onChange={e => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => query && setShowDropdown(true)}
                placeholder="Search jewelry..."
                style={{
                  width: "100%", padding: "10px 36px 10px 38px",
                  borderRadius: 30, border: "1.5px solid #f0d4dc",
                  fontSize: 14, outline: "none", background: "#fff",
                  color: "#333", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocusCapture={e => { (e.target as HTMLInputElement).style.borderColor = "#fda1b7"; (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(253,161,183,0.12)"; }}
                onBlurCapture={e => { (e.target as HTMLInputElement).style.borderColor = "#f0d4dc"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
              />
              {searching && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#fda1b7" }}>⏳</span>}
              {query && !searching && (
                <button onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); }}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#ccc", lineHeight: 1, padding: 0 }}>×</button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && query && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", borderRadius: 16, border: "1px solid #f5e0e6", boxShadow: "0 12px 40px rgba(253,161,183,0.18)", zIndex: 200, overflow: "hidden", maxHeight: 400, overflowY: "auto" }}>
                {results.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#bbb", fontSize: 14 }}>No results for "<strong>{query}</strong>"</div>
                ) : (
                  <>
                    {results.map(p => (
                      <Link key={p.id} href={`/products/${p.handle || p.id}`}
                        onClick={() => { setShowDropdown(false); setQuery(""); }}
                        style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid #fdf0f3", color: "inherit", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "#fef9fb"}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}>
                        <div style={{ width: 46, height: 46, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#fff" }}>
                          {getImg(p) ? (
                            <img src={getImg(p)!} alt={p.name_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>💍</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name_en}</div>
                          {p.category_name && <div style={{ fontSize: 12, color: "#fda1b7" }}>{p.category_name}</div>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fda1b7", flexShrink: 0 }}>{p.price} EGP</div>
                      </Link>
                    ))}
                    <button onClick={() => { setShowDropdown(false); router.push(`/shop?search=${encodeURIComponent(query)}`); }}
                      style={{ width: "100%", padding: 12, background: "#fff", border: "none", color: "#fda1b7", fontSize: 13, fontWeight: 700, cursor: "pointer", borderTop: "1px solid #f5e0e6" }}>
                      View all results for "{query}" →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Nav links - desktop */}
          <nav style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }} className="desktop-nav">
            {NAV_LINKS.map(item => (
              <Link key={item.href} href={item.href} style={{
                padding: "7px 11px", borderRadius: 20, textDecoration: "none",
                fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
                color: pathname === item.href ? "#fda1b7" : "#555",
                background: pathname === item.href ? "#fef4f0" : "transparent",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { if (pathname !== item.href) (e.currentTarget as HTMLAnchorElement).style.color = "#fda1b7"; }}
                onMouseLeave={e => { if (pathname !== item.href) (e.currentTarget as HTMLAnchorElement).style.color = "#555"; }}>
                {item.label}
              </Link>
            ))}
            <Link href="/cart" style={{ position: "relative", padding: "7px 10px", textDecoration: "none", fontSize: 22 }}>
              🛒
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, background: "#fda1b7", color: "#fff", width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Mobile cart + menu */}
          <div className="mobile-nav" style={{ display: "none", alignItems: "center", gap: 8 }}>
            <Link href="/cart" style={{ position: "relative", fontSize: 22, textDecoration: "none" }}>
              🛒
              {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#fda1b7", color: "#fff", width: 16, height: 16, borderRadius: "50%", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#fda1b7" }}>
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div style={{ background: "#fff", borderTop: "1px solid #fdf0f3", padding: "12px 24px" }}>
            {NAV_LINKS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                style={{ display: "block", padding: "10px 0", fontSize: 15, fontWeight: 600, color: pathname === item.href ? "#fda1b7" : "#333", textDecoration: "none", borderBottom: "1px solid #fdf0f3" }}>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <style jsx global>{`
        @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: flex !important; }
        }
      `}</style>
    </>
  );
}
