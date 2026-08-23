"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";

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
  const [firstLoad, setFirstLoad] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", name_ar: "", cost: 80 });
  const [addMsg, setAddMsg] = useState("");
  const [pendingCosts, setPendingCosts] = useState<Record<number, number>>({});
  const [expandedGov, setExpandedGov] = useState<number | null>(null);
  const [cities, setCities] = useState<Record<number, City[]>>({});
  const [loadingCities, setLoadingCities] = useState(false);
  const [addCityForm, setAddCityForm] = useState({ name: "", name_ar: "", cost: "" });
  const [addCityMsg, setAddCityMsg] = useState("");
  const [pendingCityCosts, setPendingCityCosts] = useState<Record<number, string>>({});
  const [savingCities, setSavingCities] = useState(false);

  async function loadRates() {
    try {
      const res = await fetch(`${API}/shipping?admin=true`);
      const data = await res.json();
      if (Array.isArray(data.rates) && data.rates.length > 0) {
        setRates(data.rates);
        setFreeThreshold(data.free_threshold || 900);
      }
    } catch {}
    setFirstLoad(false);
  }

  useEffect(() => { loadRates(); }, []);

  const fetchCities = async (govId: number) => {
    setLoadingCities(true);
    try {
      const res = await fetch(`${API}/shipping/${govId}/cities`);
      const data = await res.json();
      setCities(prev => ({ ...prev, [govId]: data.cities || [] }));
    } catch {}
    setLoadingCities(false);
  };

  const toggleExpand = async (govId: number) => {
    if (expandedGov === govId) {
      setExpandedGov(null);
    } else {
      setExpandedGov(govId);
      setAddCityForm({ name: "", name_ar: "", cost: "" });
      setAddCityMsg("");
      setPendingCityCosts({});
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
      setSaveMsg("✅ تم الحفظ!");
      loadRates();
    } catch { setSaveMsg("❌ فشل الحفظ"); }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const saveAllCities = async (govId: number) => {
    if (Object.keys(pendingCityCosts).length === 0) return;
    setSavingCities(true);
    try {
      await Promise.all(
        Object.entries(pendingCityCosts).map(([cityId, costStr]) =>
          fetch(`${API}/shipping/city/${cityId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cost: costStr === "" ? null : Number(costStr) }),
          })
        )
      );
      setPendingCityCosts({});
      await fetchCities(govId);
    } catch {}
    setSavingCities(false);
  };

  const toggleActive = async (r: Rate) => {
    setRates(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
    await fetch(`${API}/shipping/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !r.is_active }),
    });
  };

  const deleteRate = async (r: Rate) => {
    if (!confirm(`حذف "${r.name_ar || r.name}"؟`)) return;
    setRates(prev => prev.filter(x => x.id !== r.id));
    if (expandedGov === r.id) setExpandedGov(null);
    await fetch(`${API}/shipping/${r.id}`, { method: "DELETE" });
  };

  const addGovernorate = async () => {
    if (!addForm.name.trim()) { setAddMsg("اكتب الاسم"); return; }
    try {
      const res = await fetch(`${API}/shipping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.rate) {
        setRates(prev => [...prev, data.rate].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setAddMsg("✅ تمت الإضافة!");
      setAddForm({ name: "", name_ar: "", cost: 80 });
      setTimeout(() => { setAddMsg(""); setShowAdd(false); }, 1500);
    } catch { setAddMsg("❌ فشل"); }
  };

  const setCost = (id: number, cost: number) => {
    setPendingCosts(p => ({ ...p, [id]: cost }));
    setRates(prev => prev.map(r => r.id === id ? { ...r, cost } : r));
  };

  const updateCityCostLocal = (cityId: number, val: string) => {
    setPendingCityCosts(p => ({ ...p, [cityId]: val }));
    setCities(prev => {
      const updated: Record<number, City[]> = {};
      for (const [k, arr] of Object.entries(prev)) {
        updated[Number(k)] = arr.map(c =>
          c.id === cityId ? { ...c, cost: val === "" ? null : Number(val) } : c
        );
      }
      return updated;
    });
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

  const toggleCityActive = async (city: City, govId: number) => {
    setCities(prev => ({
      ...prev,
      [govId]: (prev[govId] || []).map(c => c.id === city.id ? { ...c, is_active: !c.is_active } : c),
    }));
    await fetch(`${API}/shipping/city/${city.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !city.is_active }),
    });
  };

  const deleteCity = async (cityId: number, govId: number) => {
    setCities(prev => ({ ...prev, [govId]: (prev[govId] || []).filter(c => c.id !== cityId) }));
    await fetch(`${API}/shipping/city/${cityId}`, { method: "DELETE" });
  };

  const filtered = rates.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.name_ar.includes(search)
  );

  const activeRates = rates.filter(r => r.is_active);
  const avg = activeRates.length > 0
    ? Math.round(activeRates.reduce((s, r) => s + r.cost, 0) / activeRates.length)
    : 0;

  const hasPendingGov = Object.keys(pendingCosts).length > 0;
  const hasPendingCity = Object.keys(pendingCityCosts).length > 0;

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #f4f3ff; }
        input, select { font-size: 16px !important; }
        .city-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        @media (max-width: 600px) { .city-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ minHeight: "100vh", padding: "20px 16px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <Link href="/admin" style={{ color: "#7c3aed", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← لوحة التحكم</Link>
              <h1 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800, color: "#1e1b4b" }}>أسعار الشحن</h1>
              <p style={{ margin: "3px 0 0", color: "#888", fontSize: 13 }}>اضغط على المحافظة لإدارة مدنها — كل مدينة تقدر يكون ليها سعر خاص</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShowAdd(true)}
                style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                + محافظة جديدة
              </button>
              <button onClick={saveAll} disabled={saving || !hasPendingGov}
                style={{ padding: "10px 22px", borderRadius: 10, border: "none", fontWeight: 700, cursor: hasPendingGov ? "pointer" : "not-allowed",
                  background: hasPendingGov ? "linear-gradient(135deg,#fda1b7,#f78fa3)" : "#e5e7eb",
                  color: hasPendingGov ? "#fff" : "#aaa", fontSize: 13 }}>
                {saving ? "جاري..." : saveMsg || `💾 حفظ المحافظات${hasPendingGov ? ` (${Object.keys(pendingCosts).length})` : ""}`}
              </button>
            </div>
          </div>

          {/* Add Governorate Modal */}
          {showAdd && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
              onClick={() => setShowAdd(false)}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
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
                      style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
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
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 28 }}>🎁</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>شحن مجاني عند</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>أوردرات فوق الحد ده الشحن بيبقا مجاناً</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" value={freeThreshold} onChange={e => setFreeThreshold(Number(e.target.value))}
                style={{ width: 110, padding: "9px 12px", borderRadius: 10, border: "2px solid #7c3aed", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" }} />
              <span style={{ fontWeight: 700, color: "#888" }}>EGP</span>
              <button onClick={saveAll} disabled={saving}
                style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                حفظ
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { label: "المحافظات", value: rates.length },
              { label: "الفعّالة", value: activeRates.length },
              { label: "متوسط الشحن", value: avg ? `${avg} EGP` : "—" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 11, color: "#888" }}>{s.label}</p>
                <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: "#7c3aed" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <input type="text" placeholder="ابحث عن محافظة..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14, marginBottom: 10, outline: "none" }} />

          {/* List */}
          {firstLoad ? (
            <div style={{ textAlign: "center", padding: 60, color: "#bbb", fontSize: 14 }}>جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#bbb", fontSize: 14 }}>لا توجد محافظات</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map(r => (
                <div key={r.id} style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden", opacity: r.is_active ? 1 : 0.6, border: pendingCosts[r.id] !== undefined ? "2px solid #fda1b7" : "2px solid transparent" }}>

                  {/* Governorate row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px" }}>
                    <button onClick={() => toggleExpand(r.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: expandedGov === r.id ? "#7c3aed" : "#ede9fe", color: expandedGov === r.id ? "#fff" : "#7c3aed", cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {expandedGov === r.id ? "▲" : "▼"}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{r.name}</span>
                      <span style={{ marginLeft: 8, fontSize: 13, color: "#888" }}>{r.name_ar}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <input type="number" value={r.cost}
                        onChange={e => setCost(r.id, Number(e.target.value))}
                        disabled={!r.is_active}
                        style={{ width: 80, padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${pendingCosts[r.id] !== undefined ? "#fda1b7" : "#c4b5fd"}`, fontSize: 14, fontWeight: 700, textAlign: "center", outline: "none", color: "#7c3aed", background: r.is_active ? "#fff" : "#f5f5f5" }} />
                      <span style={{ fontSize: 11, color: "#aaa" }}>EGP</span>

                      <button onClick={() => toggleActive(r)} title={r.is_active ? "إخفاء" : "تفعيل"}
                        style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                          background: r.is_active ? "#d1fae5" : "#fee2e2",
                          color: r.is_active ? "#059669" : "#ef4444" }}>
                        {r.is_active ? "✓" : "✗"}
                      </button>

                      <button onClick={() => deleteRate(r)} title="حذف"
                        style={{ padding: "5px 8px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: 13 }}>
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Cities Panel */}
                  {expandedGov === r.id && (
                    <div style={{ borderTop: "2px solid #f3f4f6", background: "#fafafa", padding: "14px 16px 16px" }}>

                      {/* Cities header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>
                          مدن {r.name_ar || r.name}
                          {(cities[r.id] || []).length > 0 && <span style={{ marginRight: 6, fontSize: 11, color: "#aaa", fontWeight: 400 }}>({(cities[r.id] || []).length} مدينة)</span>}
                        </p>
                        {hasPendingCity && (
                          <button onClick={() => saveAllCities(r.id)} disabled={savingCities}
                            style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "#fda1b7", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {savingCities ? "جاري..." : `💾 حفظ المدن (${Object.keys(pendingCityCosts).length})`}
                          </button>
                        )}
                      </div>

                      {loadingCities && !cities[r.id] ? (
                        <div style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>جاري التحميل...</div>
                      ) : (
                        <>
                          {(cities[r.id] || []).length === 0 ? (
                            <p style={{ fontSize: 13, color: "#bbb", margin: "0 0 12px", textAlign: "center", padding: "12px 0" }}>
                              لا توجد مدن — سعر الشحن = سعر المحافظة ({r.cost} EGP)
                            </p>
                          ) : (
                            <div className="city-grid" style={{ marginBottom: 12 }}>
                              {(cities[r.id] || []).map(city => (
                                <div key={city.id} style={{
                                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                                  borderRadius: 10, background: city.is_active ? "#fff" : "#f5f5f5",
                                  border: `1px solid ${pendingCityCosts[city.id] !== undefined ? "#fda1b7" : "#e5e7eb"}`,
                                  opacity: city.is_active ? 1 : 0.55
                                }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {city.name_ar || city.name}
                                    </div>
                                    {city.name_ar && <div style={{ fontSize: 10, color: "#aaa" }}>{city.name}</div>}
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                    <input
                                      type="number"
                                      value={pendingCityCosts[city.id] !== undefined ? pendingCityCosts[city.id] : (city.cost !== null ? String(city.cost) : "")}
                                      placeholder={String(r.cost)}
                                      onChange={e => updateCityCostLocal(city.id, e.target.value)}
                                      disabled={!city.is_active}
                                      style={{ width: 72, padding: "5px 6px", borderRadius: 7, border: `1.5px solid ${pendingCityCosts[city.id] !== undefined ? "#fda1b7" : "#e5e7eb"}`, fontSize: 13, fontWeight: 700, textAlign: "center", outline: "none", color: "#7c3aed", background: city.is_active ? "#fff" : "#f5f5f5" }}
                                    />
                                    <span style={{ fontSize: 10, color: "#bbb" }}>EGP</span>
                                    <button onClick={() => toggleCityActive(city, r.id)} title={city.is_active ? "إخفاء" : "تفعيل"}
                                      style={{ padding: "4px 8px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: city.is_active ? "#d1fae5" : "#fee2e2", color: city.is_active ? "#059669" : "#ef4444" }}>
                                      {city.is_active ? "✓" : "✗"}
                                    </button>
                                    <button onClick={() => deleteCity(city.id, r.id)} title="حذف"
                                      style={{ padding: "4px 6px", borderRadius: 7, border: "none", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: 11 }}>
                                      🗑
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add city form */}
                          <div style={{ background: "#fff", borderRadius: 10, padding: "12px", border: "1px dashed #e5e7eb" }}>
                            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#888" }}>إضافة مدينة جديدة</p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
                              <input placeholder="الاسم (EN)" value={addCityForm.name}
                                onChange={e => setAddCityForm(p => ({ ...p, name: e.target.value }))}
                                style={{ flex: 2, minWidth: 100, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 13, outline: "none" }} />
                              <input placeholder="الاسم (AR)" value={addCityForm.name_ar}
                                onChange={e => setAddCityForm(p => ({ ...p, name_ar: e.target.value }))}
                                style={{ flex: 2, minWidth: 100, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 13, outline: "none", direction: "rtl" }} />
                              <input type="number" placeholder={`سعر خاص (افتراضي: ${r.cost})`} value={addCityForm.cost}
                                onChange={e => setAddCityForm(p => ({ ...p, cost: e.target.value }))}
                                style={{ width: 140, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #eee", fontSize: 13, outline: "none" }} />
                              <button onClick={() => addCity(r.id)}
                                style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                                + إضافة
                              </button>
                            </div>
                            {addCityMsg && <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: addCityMsg.includes("✅") ? "#166534" : "#991b1b" }}>{addCityMsg}</p>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bottom Save */}
          {hasPendingGov && (
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={saveAll} disabled={saving}
                style={{ padding: "13px 36px", borderRadius: 12, border: "none", background: saving ? "#aaa" : "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
                {saving ? "جاري الحفظ..." : saveMsg || `💾 حفظ كل التغييرات (${Object.keys(pendingCosts).length})`}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
