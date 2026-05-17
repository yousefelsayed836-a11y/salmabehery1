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

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function Header() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  const isHome = pathname === '/';

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  if (isDashboard) return null;

  const isTransparent = isHome && !scrolled;

  return (
    <>
      {/* Header */}
      <header style={{
        position: isHome ? "fixed" : "sticky",
        top: "40px",
        left: 0,
        right: 0,
        zIndex: 100,
        background: isTransparent ? "transparent" : "#fff",
        borderBottom: isTransparent ? "none" : "1px solid #f5e6ea",
        boxShadow: isTransparent ? "none" : "0 2px 12px rgba(253,161,183,0.08)",
        padding: "8px 24px",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          {/* Left: Menu + Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="mobile-nav"
              style={{ 
                background: "none", 
                border: "none", 
                cursor: "pointer", 
                color: isTransparent ? "#fff" : "#1a1a2e", 
                display: "none",
                padding: 4,
              }}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            <button 
              className="desktop-icon"
              style={{ 
                background: "none", 
                border: "none", 
                cursor: "pointer", 
                color: isTransparent ? "#fff" : "#1a1a2e",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <SearchIcon />
            </button>
          </div>

          {/* Center: Logo */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            <span style={{
              fontFamily: "var(--font-roboto-condensed), sans-serif",
              fontWeight: 500,
              fontSize: 24,
              letterSpacing: 2,
              whiteSpace: "nowrap",
              textTransform: "uppercase" as const,
              color: isTransparent ? "#fff" : "#1a1a2e",
              transition: "color 0.3s ease",
              display: "block",
            }}>
              Salma Behery
            </span>
          </Link>

          {/* Right: Cart Only (No User Icon) */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, justifyContent: "flex-end" }}>
            <Link 
              href="/checkout" 
              style={{ 
                position: "relative", 
                color: isTransparent ? "#fff" : "#1a1a2e", 
                textDecoration: "none", 
                display: "flex", 
                alignItems: "center", 
                padding: "6px 8px", 
                borderRadius: 10, 
                transition: "all 0.2s" 
              }}
              onMouseEnter={e => !isTransparent && ((e.currentTarget as HTMLAnchorElement).style.background = "#fef4f0")}
              onMouseLeave={e => !isTransparent && ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")}
            >
              <BagIcon />
              {cartCount > 0 && (
                <span style={{ 
                  position: "absolute", 
                  top: 0, 
                  right: 0, 
                  background: "#fda1b7", 
                  color: "#fff", 
                  width: 18, 
                  height: 18, 
                  borderRadius: "50%", 
                  fontSize: 10, 
                  fontWeight: 700, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav 
          className="desktop-nav"
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            gap: 8,
            marginTop: isHome ? 8 : 0,
            paddingTop: isHome ? 8 : 0,
            borderTop: isHome ? `1px solid ${isTransparent ? 'rgba(255,255,255,0.2)' : '#f5e6ea'}` : 'none',
          }}
        >
          {NAV_LINKS.map(item => (
            <Link 
              key={item.href} 
              href={item.href} 
              style={{
                padding: "7px 16px", 
                borderRadius: 20, 
                textDecoration: "none",
                fontSize: 13, 
                fontWeight: 500, 
                whiteSpace: "nowrap",
                color: pathname === item.href ? "#fda1b7" : (isTransparent ? "#fff" : "#555"),
                background: pathname === item.href ? (isTransparent ? "rgba(255,255,255,0.15)" : "#fef4f0") : "transparent",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { 
                if (pathname !== item.href) (e.currentTarget as HTMLAnchorElement).style.color = "#fda1b7"; 
              }}
              onMouseLeave={e => { 
                if (pathname !== item.href) (e.currentTarget as HTMLAnchorElement).style.color = isTransparent ? "#fff" : "#555"; 
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div style={{
            background: "#fff",
            borderTop: "1px solid #fdf0f3",
            padding: "12px 24px",
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          }}>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: "block",
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: pathname === "/" ? "#fda1b7" : "#1a1a2e",
                textDecoration: "none",
                borderBottom: "1px solid #fdf0f3",
                fontFamily: "inherit",
              }}
            >
              Home
            </Link>
            {NAV_LINKS.map(item => (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: pathname === item.href ? "#fda1b7" : "#1a1a2e",
                  textDecoration: "none",
                  borderBottom: "1px solid #fdf0f3",
                  fontFamily: "inherit",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .desktop-icon { display: none !important; }
          .mobile-nav  { display: flex !important; }
        }
      `}</style>
    </>
  );
}
