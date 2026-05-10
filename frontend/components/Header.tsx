"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: "Shop",          href: "/shop" },
  { label: "Rings",         href: "/shop/rings" },
  { label: "Necklaces",     href: "/shop/necklace" },
  { label: "Bracelets",     href: "/shop/bracelet" },
  { label: "Earrings",      href: "/shop/earrings" },
  { label: "Sets & Offers", href: "/shop/sets-and-offers" },
];

const BagIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

export default function Header() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

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

  if (isDashboard) return null;

  return (
    <>
      {/* Ticker */}
      <div style={{ background: "#fda1b7", overflow: "hidden", padding: "9px 0", position: "sticky", top: 0, zIndex: 101 }}>
        <div style={{ display: "flex", width: "200%", animation: "tickerScroll 22s linear infinite" }}>
          {[1, 2].map(k => (
            <div key={k} style={{ flex: "0 0 50%", display: "flex", justifyContent: "space-around" }}>
              {Array(5).fill("🚚 Free Shipping on orders above 900 EGP").map((t, i) => (
                <span key={i} style={{ color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: 1.5, whiteSpace: "nowrap", padding: "0 40px" }}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header style={{ position: "sticky", top: "38px", zIndex: 100, background: "#fff", borderBottom: "1px solid #f5e6ea", boxShadow: "0 2px 12px rgba(253,161,183,0.08)", padding: "12px 24px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <img src="https://assets.wuiltstore.com/cmmghekwr0oa601k44qqgca21__D8_AA_D8_B5_D9_85_D9_8A_D9_85__D8_A8_D8_AF_D9_88_D9_86__D8_B9_D9_86_D9_88_D8_A7_D9_86__2_.webp"
              alt="Salma Behery" style={{ height: 46, width: "auto" }} />
          </Link>

          {/* Nav - desktop */}
          <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="desktop-nav">
            {NAV_LINKS.map(item => (
              <Link key={item.href} href={item.href} style={{
                padding: "7px 13px", borderRadius: 20, textDecoration: "none",
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
          </nav>

          {/* Cart + Mobile menu */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/checkout" style={{ position: "relative", color: "#1a1a2e", textDecoration: "none", display: "flex", alignItems: "center", padding: "6px 8px", borderRadius: 10, transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "#fef4f0"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}>
              <BagIcon />
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: 0, right: 0, background: "#fda1b7", color: "#fff", width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-nav"
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#fda1b7", display: "none" }}>
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
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
