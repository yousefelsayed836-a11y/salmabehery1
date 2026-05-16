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

interface City {
  id: number;
  governorate_id: number;
  name: string;
  name_ar: string;
  cost: number | null;
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

  // Cities state
  const [expandedGov, setExpandedGov] = useState<number | null>(null);
  const [cities, setCities] = useState<Record<number, City[]>>({});
  const [loadingCities, setLoadingCities] = useState(false);
  const [addCityForm, setAddCityForm] = useState({ name: "", name_ar: "", cost: "" });
  const [addCityMsg, setAddCityMsg] = useState("");
  const [pendingCityCosts, setPendingCityCosts] = useState<Record<number, string>>({});
  const [editingCity, setEditingCity] = useState<number | null>(null);

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

  const fetchCities = async (govId: number) => {
    setLoadingCities(true);
    try {
      const res = await fetch(`${API}/shipping/${govId}/cities`);
      const data = await res.json();
      setCities(prev => ({ ...prev, [govId]: data.cities || [] }));
    } catch {}
    finally { setLoadingCities(false); }
  };

  const toggleExpand = async (govId: number) => {
    if (expandedGov === govId) {
      setExpandedGov(null);
    } else {
      setExpandedGov(govId);
      setAddCityForm({ name: "", name_ar: "", cost: "" });
      setAddCityMsg("");
      setPendingCityCosts({});
      setEditingCity(null);
      if (!cities[govId]) await fetchCities(govId);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/shipping/threshold/set`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: freeThreshold }),
      });
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
    if (expandedGov === r.id) setExpandedGov(null);
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

  const addCity = async (govId: number) => {
    if (!addCityForm.name.trim()) { setAddCityMsg("اكتب اسم المدينة"); return; }
    try {
      await fetch(`${API}/shipping/${govId}/cities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addCityForm.name,
          name_ar: addCityForm.name_ar,
          cost: addCityForm.cost !== "" ? Number(addCityForm.cost) : null,
        }),
      });
      setAddCityMsg("✅ تمت الإضافة!");
      setAddCityForm({ name: "", name_ar: "", cost: "" });
      await fetchCities(govId);
      setTimeout(() => setAddCityMsg(""), 2000);
    } catch { setAddCityMsg("❌ فشل"); }
  };

  const saveCityCost = async (city: City, govId: number) => {
    const costVal = pendingCityCosts[city.id];
    const cost = costVal === "" ? null : Number(costVal);
    await fetch(`${API}/shipping/city/${city.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cost }),
    });
    setPendingCityCosts(p => { const n = { ...p }; delete n[city.id]; return n; });
    setEditingCity(null);
    await fetchCities(govId);
  };

  const toggleCityActive = async (city: City, govId: number) => {
    await fetch(`${API}/shipping/city/${city.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !city.is_active }),
    });
    await fetchCities(govId);
  };

  const deleteCity = async (cityId: number, govId: number) => {
    if (!confirm("حذف المدينة؟")) return;
    await fetch(`${API}/shipping/city/${cityId}`, { method: "DELETE" });
    await fetchCities(govId);
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
              <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>اضغط على المحافظة لإدارة مدنها وأسعارها</p>
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

          {/* Add Governorate Modal */}
          {showAdd && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setShowAdd(false)}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: "#fff", borderRadius: 20, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                <h3 style={{ margin: "0 0 16px", color: "#1a1a2e" }}>إضافة محافظة جديدة</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input placeholder="الاسم بالإنجليزي" value={addForm.name}
                    onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none" }} />
                  <input placeholder="الاسم بالعربي" value={addForm.name_ar}
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

          {/* Governorates List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>جاري التحميل...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((r, i) => (
                <div key={r.id} style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden", opacity: r.is_active ? 1 : 0.6 }}>

                  {/* Governorate Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: i % 2 === 0 ? "#fff" : "#fffcfd" }}>
                    {/* Expand button */}
                    <button
                      onClick={() => toggleExpand(r.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: expandedGov === r.id ? "#fda1b7" : "#f5f5f5", color: expandedGov === r.id ? "#fff" : "#555", cursor: "pointer", fontSize: 14, fontWeight: 700, flexShrink: 0 }}
                    >
                      {expandedGov === r.id ? "▲" : "▼"}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{r.name}</span>
                      <span style={{ marginLeft: 8, fontSize: 13, color: "#888", direction: "rtl" }}>{r.name_ar}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <input
                        type="number"
                        value={r.cost}
                        onChange={e => setCost(r.id, Number(e.target.value))}
                        disabled={!r.is_active}
                        style={{ width: 85, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #f0d4dc", fontSize: 14, fontWeight: 700, textAlign: "center", outline: "none", color: "#fda1b7", background: r.is_active ? "#fff" : "#f5f5f5" }}
                      />
                      <span style={{ fontSize: 12, color: "#aaa" }}>EGP</span>

                      <button onClick={() => toggleActive(r)}
                        style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                          background: r.is_active ? "#dcfce7" : "#fee2e2",
                          color: r.is_active ? "#166534" : "#991b1b" }}>
                        {r.is_active ? "✓" : "✗"}
                      </button>

                      <button onClick={() => deleteRate(r)}
                        style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Cities Panel */}
                  {expandedGov === r.id && (
                    <div style={{ borderTop: "2px solid #fdf0f3", background: "#fffbfc", padding: "14px 16px 16px" }}>
                      <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#fda1b7" }}>🏙️ مدن {r.name_ar || r.name}</p>

                      {loadingCities && !cities[r.id] ? (
                        <div style={{ color: "#aaa", fontSize: 13 }}>جاري التحميل...</div>
                      ) : (
                        <>
                          {/* Cities Table */}
                          {(cities[r.id] || []).length === 0 ? (
                            <p style={{ fontSize: 13, color: "#bbb", margin: "0 0 12px" }}>لا توجد مدن مضافة — أسعار الشحن تستخدم سعر المحافظة</p>
                          ) : (
                            <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                              {(cities[r.id] || []).map(city => (
                                <div key={city.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: city.is_active ? "#fff" : "#f9f9f9", border: "1px solid #eee", opacity: city.is_active ? 1 : 0.55 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{city.name}</span>
                                    {city.name_ar && <span style={{ marginLeft: 6, fontSize: 12, color: "#888" }}>{city.name_ar}</span>}
                                  </div>

                                  {editingCity === city.id ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <input
                                        type="number"
                                        placeholder={`افتراضي: ${r.cost}`}
                                        value={pendingCityCosts[city.id] ?? (city.cost !== null ? String(city.cost) : "")}
                                        onChange={e => setPendingCityCosts(p => ({ ...p, [city.id]: e.target.value }))}
                                        style={{ width: 100, padding: "5px 8px", borderRadius: 8, border: "1.5px solid #fda1b7", fontSize: 13, outline: "none", textAlign: "center" }}
                                        autoFocus
                                      />
                                      <span style={{ fontSize: 11, color: "#aaa" }}>EGP</span>
                                      <button onClick={() => saveCityCost(city, r.id)}
                                        style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "#fda1b7", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                        حفظ
                                      </button>
                                      <button onClick={() => setEditingCity(null)}
                                        style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#888", fontSize: 12, cursor: "pointer" }}>
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span
                                        onClick={() => setEditingCity(city.id)}
                                        style={{ padding: "4px 12px", borderRadius: 8, background: city.cost !== null ? "#fdf0f3" : "#f5f5f5", color: city.cost !== null ? "#fda1b7" : "#aaa", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px dashed #fda1b766" }}
                                      >
                                        {city.cost !== null ? `${city.cost} EGP` : `${r.cost} EGP ↑`}
                                      </span>
                                      <button onClick={() => toggleCityActive(city, r.id)}
                                        style={{ padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                                          background: city.is_active ? "#dcfce7" : "#fee2e2",
                                          color: city.is_active ? "#166534" : "#991b1b" }}>
                                        {city.is_active ? "✓" : "✗"}
                                      </button>
                                      <button onClick={() => deleteCity(city.id, r.id)}
                                        style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: 12 }}>
                                        🗑
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add City Form */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <input
                              placeholder="اسم المدينة (EN)"
                              value={addCityForm.name}
                              onChange={e => setAddCityForm(p => ({ ...p, name: e.target.value }))}
                              style={{ flex: 2, minWidth: 120, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 13, outline: "none" }}
                            />
                            <input
                              placeholder="اسم المدينة (AR)"
                              value={addCityForm.name_ar}
                              onChange={e => setAddCityForm(p => ({ ...p, name_ar: e.target.value }))}
                              style={{ flex: 2, minWidth: 120, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 13, outline: "none", direction: "rtl" }}
                            />
                            <input
                              type="number"
                              placeholder={`سعر خاص (اختياري)`}
                              value={addCityForm.cost}
                              onChange={e => setAddCityForm(p => ({ ...p, cost: e.target.value }))}
                              style={{ width: 130, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 13, outline: "none" }}
                            />
                            <button onClick={() => addCity(r.id)}
                              style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                              + إضافة مدينة
                            </button>
                          </div>
                          {addCityMsg && <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 600, color: addCityMsg.includes("✅") ? "#166534" : "#991b1b" }}>{addCityMsg}</p>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
