"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const GOVERNORATES_DEFAULT = [
  { name: "Cairo", nameAr: "القاهرة", cost: 60 },
  { name: "Giza", nameAr: "الجيزة", cost: 60 },
  { name: "Alexandria", nameAr: "الإسكندرية", cost: 70 },
  { name: "Dakahlia", nameAr: "الدقهلية", cost: 80 },
  { name: "Red Sea", nameAr: "البحر الأحمر", cost: 100 },
  { name: "Beheira", nameAr: "البحيرة", cost: 80 },
  { name: "Fayoum", nameAr: "الفيوم", cost: 80 },
  { name: "Gharbia", nameAr: "الغربية", cost: 80 },
  { name: "Ismailia", nameAr: "الإسماعيلية", cost: 80 },
  { name: "Menofia", nameAr: "المنوفية", cost: 80 },
  { name: "Minya", nameAr: "المنيا", cost: 85 },
  { name: "Qalyubia", nameAr: "القليوبية", cost: 65 },
  { name: "New Valley", nameAr: "الوادي الجديد", cost: 120 },
  { name: "Suez", nameAr: "السويس", cost: 80 },
  { name: "Aswan", nameAr: "أسوان", cost: 100 },
  { name: "Assiut", nameAr: "أسيوط", cost: 90 },
  { name: "Beni Suef", nameAr: "بني سويف", cost: 80 },
  { name: "Port Said", nameAr: "بورسعيد", cost: 80 },
  { name: "Damietta", nameAr: "دمياط", cost: 80 },
  { name: "Sharqia", nameAr: "الشرقية", cost: 80 },
  { name: "South Sinai", nameAr: "جنوب سيناء", cost: 110 },
  { name: "Kafr El Sheikh", nameAr: "كفر الشيخ", cost: 80 },
  { name: "Matrouh", nameAr: "مطروح", cost: 110 },
  { name: "Luxor", nameAr: "الأقصر", cost: 100 },
  { name: "Qena", nameAr: "قنا", cost: 95 },
  { name: "North Sinai", nameAr: "شمال سيناء", cost: 100 },
  { name: "Sohag", nameAr: "سوهاج", cost: 90 },
];

const STORAGE_KEY = "shipping_rates";

export default function ShippingPage() {
  const [rates, setRates] = useState(GOVERNORATES_DEFAULT);
  const [freeThreshold, setFreeThreshold] = useState(900);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.rates) setRates(parsed.rates);
        if (parsed.freeThreshold) setFreeThreshold(parsed.freeThreshold);
      }
    } catch {}
  }, []);

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rates, freeThreshold }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  const updateCost = (name: string, cost: number) => {
    setRates(prev => prev.map(r => r.name === name ? { ...r, cost } : r));
  };

  const filtered = rates.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.nameAr.includes(search)
  );

  const avg = Math.round(rates.reduce((s, r) => s + r.cost, 0) / rates.length);

  return (
    <>
      <style jsx global>{`* { box-sizing: border-box; } body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #f5f5f5; }`}</style>

      <div style={{ minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <Link href="/admin" style={{ color: "#fda1b7", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Back to Dashboard</Link>
              <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>🚚 Shipping Rates</h1>
              <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Set shipping cost per governorate — saved in browser</p>
            </div>
            <button onClick={save} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: saved ? "#22c55e" : "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
              {saved ? "✅ Saved!" : "💾 Save Changes"}
            </button>
          </div>

          {/* Free Shipping Threshold */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 32 }}>🎁</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Free Shipping Threshold</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#888" }}>Orders above this amount get free shipping</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" value={freeThreshold} onChange={e => setFreeThreshold(Number(e.target.value))}
                style={{ width: 120, padding: "10px 14px", borderRadius: 10, border: "2px solid #fda1b7", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" }} />
              <span style={{ fontWeight: 700, color: "#888" }}>EGP</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Governorates", value: rates.length, bg: "#fda1b722", color: "#fda1b7" },
              { label: "Avg. Shipping", value: `${avg} EGP`, bg: "#dcfce722", color: "#166534" },
              { label: "Free above", value: `${freeThreshold} EGP`, bg: "#dbeafe22", color: "#1e40af" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{s.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <input type="text" placeholder="Search governorate..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14, marginBottom: 16, outline: "none" }} />

          {/* Rates Table */}
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1a1a2e", color: "#fff" }}>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12 }}>GOVERNORATE</th>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12 }}>ARABIC</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 12 }}>SHIPPING COST (EGP)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.name} style={{ borderBottom: "1px solid #f5f5f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{r.name}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#555", direction: "rtl" }}>{r.nameAr}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <input
                        type="number"
                        value={r.cost}
                        onChange={e => updateCost(r.name, Number(e.target.value))}
                        style={{ width: 100, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #f0d4dc", fontSize: 14, fontWeight: 700, textAlign: "center", outline: "none", color: "#fda1b7" }}
                        onFocus={e => (e.target as HTMLInputElement).style.borderColor = "#fda1b7"}
                        onBlur={e => (e.target as HTMLInputElement).style.borderColor = "#f0d4dc"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, textAlign: "right" }}>
            <button onClick={save} style={{ padding: "14px 36px", borderRadius: 12, border: "none", background: saved ? "#22c55e" : "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 16 }}>
              {saved ? "✅ Saved!" : "💾 Save All Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
