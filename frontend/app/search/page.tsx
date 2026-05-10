"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

interface Product {
  id: string;
  name_en: string;
  name_ar?: string;
  price: number;
  old_price?: number;
  main_image?: string;
  images?: string[];
  category_name?: string;
  category_slug?: string;
  handle?: string;
}

function getImg(p: Product) {
  const img = p.main_image || (p.images && p.images[0]);
  if (!img) return `https://placehold.co/400x400/fda1b7/fff?text=${encodeURIComponent(p.name_en?.slice(0, 6) || "??")}`;
  if (img.startsWith("http")) return img;
  return `${process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com"}${img}`;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(query);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products?search=${encodeURIComponent(q)}&is_active=true&limit=100`, { cache: "no-store" });
      const data = await res.json();
      setResults(data.products || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setInputValue(query);
    doSearch(query);
  }, [query, doSearch]);

  // Live search as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== query) doSearch(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, query, doSearch]);

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "40px 24px", fontFamily: "'Inter', sans-serif" }}>

      {/* Search Bar */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
          <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#fda1b7" }}>🔍</span>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch(inputValue)}
            placeholder="Search for jewelry..."
            autoFocus
            style={{
              width: "100%", padding: "16px 16px 16px 52px",
              borderRadius: 50, border: "2px solid #fda1b7",
              fontSize: 16, outline: "none", boxSizing: "border-box",
              boxShadow: "0 4px 20px rgba(253,161,183,0.2)",
              background: "#fff",
            }}
          />
          {inputValue && (
            <button onClick={() => setInputValue("")}
              style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      {inputValue && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {loading ? (
            <p style={{ color: "#888", fontSize: 15 }}>Searching...</p>
          ) : (
            <p style={{ color: "#888", fontSize: 15 }}>
              {results.length > 0 ? <><strong style={{ color: "#fda1b7" }}>{results.length}</strong> results for "<strong>{inputValue}</strong>"</> : <>No results for "<strong>{inputValue}</strong>"</>}
            </p>
          )}
        </div>
      )}

      {!inputValue && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Search for your favorite jewelry</p>
          <p style={{ fontSize: 14 }}>Rings, Necklaces, Bracelets, Hand Chains...</p>
          {/* Quick categories */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
            {["Rings", "Necklace", "Bracelet", "Hand Chains"].map(cat => (
              <button key={cat} onClick={() => setInputValue(cat)}
                style={{ padding: "8px 20px", borderRadius: 50, border: "1px solid #fda1b7", background: "#fff", color: "#fda1b7", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {results.map(p => {
            const hasDiscount = p.old_price && p.old_price > p.price;
            const discount = hasDiscount ? Math.round((1 - p.price / p.old_price!) * 100) : 0;
            return (
              <Link key={p.id} href={`/products/${p.handle || p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}>
                  <div style={{ position: "relative", height: 240, background: "#fff", overflow: "hidden" }}>
                    <img src={getImg(p)} alt={p.name_en} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                      onMouseEnter={e => (e.target as HTMLImageElement).style.transform = "scale(1.05)"}
                      onMouseLeave={e => (e.target as HTMLImageElement).style.transform = "scale(1)"}
                      onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/300x300/fda1b7/fff?text=??`; }} />
                    {hasDiscount && (
                      <span style={{ position: "absolute", top: 10, left: 10, background: "#ef4444", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>-{discount}%</span>
                    )}
                    {p.category_name && (
                      <span style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(255,255,255,0.9)", color: "#fda1b7", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.category_name}</span>
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.3 }}>{p.name_en}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#fda1b7" }}>{p.price} EGP</span>
                      {hasDiscount && <span style={{ fontSize: 12, color: "#bbb", textDecoration: "line-through" }}>{p.old_price} EGP</span>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 480px) {
          div[style*="repeat(auto-fill"] { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 60, color: "#888" }}>Loading search...</div>}>
      <SearchResults />
    </Suspense>
  );
}