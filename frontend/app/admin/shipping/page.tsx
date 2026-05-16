"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

interface Rate {
  id: number;
  name: string;
  name_ar: string;
  cost: number;
  is_active: boolean;
}

export default function ShippingPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [freeThreshold, setFreeThreshold] = useState(900);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", name_ar: "", cost: 80 });
  const [addMsg, setAddMsg] = useState("");
  const [pendingCosts, setPendingCosts] = useState<Record<number, number>>({});

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/shipping?admin=true`);
      const data = await res.json();
      setRates(data.rates || []);
      setFreeThreshold(data.free_threshold || 900);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save threshold
      await fetch(`${API}/shipping/threshold/set`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: freeThreshold }),
      });
      // Save any edited costs
      await Promise.all(
        Object.entries(pendingCosts).map(([id, cost]) =>
          fetch(`${API}/shipping/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cost }),
          })
        )
      );
      setPendingCosts({});
      setSaveMsg("✅ Saved!");
      fetchRates();
    } catch { setSaveMsg("❌ Failed"); }
    finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const toggleActive = async (r: Rate) => {
    await fetch(`${API}/shipping/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !r.is_active }),
    });
    fetchRates();
  };

  const deleteRate = async (r: Rate) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    await fetch(`${API}/shipping/${r.id}`, { method: "DELETE" });
    fetchRates();
  };

  const addGovernorate = async () => {
    if (!addForm.name.trim()) { setAddMsg("اكتب الاسم"); return; }
    try {
      await fetch(`${API}/shipping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      setAddMsg("✅ تمت الإضافة!");
      setAddForm({ name: "", name_ar: "", cost: 80 });
      fetchRates();
      setTimeout(() => { setAddMsg(""); setShowAdd(false); }, 1500);
    } catch { setAddMsg("❌ فشل"); }
  };

  const setCost = (id: number, cost: number) => {
    setPendingCosts(p => ({ ...p, [id]: cost }));
    setRates(prev => prev.map(r => r.id === id ? { ...r, cost } : r));
  };

  const filtered = rates.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.name_ar.includes(search)
  );

  const activeRates = rates.filter(r => r.is_active);
  const avg = activeRates.length > 0
    ? Math.round(activeRates.reduce((s, r) => s + r.cost, 0) / activeRates.length)
    : 0;

  return (
    <>
      <style jsx global>{`* { box-sizing: border-box; } body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #f5f5f5; }`}</style>

      <div style={{ minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <Link href="/admin" style={{ color: "#fda1b7", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Back to Dashboard</Link>
              <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>🚚 Shipping Rates</h1>
              <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>محفوظ في الـ database — يأثر على الـ checkout فوراً</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAdd(true)}
                style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                + إضافة محافظة
              </button>
              <button onClick={saveAll} disabled={saving}
                style={{ padding: "11px 24px", borderRadius: 12, border: "none", background: saving ? "#aaa" : "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {saving ? "جاري..." : saveMsg || "💾 حفظ الكل"}
              </button>
            </div>
          </div>

          {/* Add Modal */}
          {showAdd && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setShowAdd(false)}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: "#fff", borderRadius: 20, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                <h3 style={{ margin: "0 0 16px", color: "#1a1a2e" }}>إضافة محافظة جديدة</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input placeholder="الاسم بالإنجليزي (مثل: Luxor)" value={addForm.name}
                    onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none" }} />
                  <input placeholder="الاسم بالعربي (مثل: الأقصر)" value={addForm.name_ar}
                    onChange={e => setAddForm(p => ({ ...p, name_ar: e.target.value }))}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none", direction: "rtl" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" placeholder="تكلفة الشحن" value={addForm.cost}
                      onChange={e => setAddForm(p => ({ ...p, cost: Number(e.target.value) }))}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none" }} />
                    <span style={{ color: "#888", fontSize: 14 }}>EGP</span>
                  </div>
                  {addMsg && <p style={{ margin: 0, fontSize: 13, color: addMsg.includes("✅") ? "#166534" : "#991b1b", fontWeight: 600 }}>{addMsg}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button onClick={addGovernorate}
                      style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                      إضافة
                    </button>
                    <button onClick={() => setShowAdd(false)}
                      style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid #eee", background: "#fff", color: "#555", fontWeight: 600, cursor: "pointer" }}>
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Free Shipping Threshold */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 32 }}>🎁</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Free Shipping عند</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#888" }}>أوردرات فوق الحد ده الشحن مجاناً</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" value={freeThreshold} onChange={e => setFreeThreshold(Number(e.target.value))}
                style={{ width: 120, padding: "10px 14px", borderRadius: 10, border: "2px solid #fda1b7", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" }} />
              <span style={{ fontWeight: 700, color: "#888" }}>EGP</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "المحافظات", value: rates.length },
              { label: "الفعّالة", value: activeRates.length },
              { label: "متوسط الشحن", value: `${avg} EGP` },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{s.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "#fda1b7" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <input type="text" placeholder="ابحث عن محافظة..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14, marginBottom: 12, outline: "none" }} />

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>جاري التحميل...</div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1a1a2e", color: "#fff" }}>
                    <th style={{ padding: "13px 16px", textAlign: "left", fontSize: 12 }}>GOVERNORATE</th>
                    <th style={{ padding: "13px 16px", textAlign: "left", fontSize: 12 }}>العربية</th>
                    <th style={{ padding: "13px 16px", textAlign: "center", fontSize: 12 }}>COST (EGP)</th>
                    <th style={{ padding: "13px 16px", textAlign: "center", fontSize: 12 }}>حالة</th>
                    <th style={{ padding: "13px 16px", textAlign: "center", fontSize: 12 }}>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f5", background: !r.is_active ? "#fafafa" : i % 2 === 0 ? "#fff" : "#fffcfd", opacity: r.is_active ? 1 : 0.55 }}>
                      <td style={{ padding: "11px 16px", fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{r.name}</td>
                      <td style={{ padding: "11px 16px", fontSize: 14, color: "#555", direction: "rtl" }}>{r.name_ar}</td>
                      <td style={{ padding: "11px 16px", textAlign: "center" }}>
                        <input
                          type="number"
                          value={r.cost}
                          onChange={e => setCost(r.id, Number(e.target.value))}
                          disabled={!r.is_active}
                          style={{ width: 90, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #f0d4dc", fontSize: 14, fontWeight: 700, textAlign: "center", outline: "none", color: "#fda1b7", background: r.is_active ? "#fff" : "#f5f5f5" }}
                        />
                      </td>
                      <td style={{ padding: "11px 16px", textAlign: "center" }}>
                        <button onClick={() => toggleActive(r)}
                          style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                            background: r.is_active ? "#dcfce7" : "#fee2e2",
                            color: r.is_active ? "#166534" : "#991b1b" }}>
                          {r.is_active ? "✓ فعّال" : "✗ مخفي"}
                        </button>
                      </td>
                      <td style={{ padding: "11px 16px", textAlign: "center" }}>
                        <button onClick={() => deleteRate(r)}
                          style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={saveAll} disabled={saving}
              style={{ padding: "13px 36px", borderRadius: 12, border: "none", background: saving ? "#aaa" : "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
              {saving ? "جاري الحفظ..." : saveMsg || "💾 حفظ كل التغييرات"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
