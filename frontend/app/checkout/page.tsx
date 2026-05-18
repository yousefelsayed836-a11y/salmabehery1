"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CartItem {
  product: { id: string; name_en: string; price: number; image_url?: string; };
  qty: number;
  size: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";

// كل المحافظات والمدن المصرية
const EGYPT_DATA: Record<string, { nameAr: string; cities: string[] }> = {
  "Cairo": { nameAr: "القاهرة", cities: ["Cairo City", "Nasr City", "Heliopolis", "Maadi", "Zamalek", "New Cairo", "6th of October City", "Shorouk", "Badr City", "Obour"] },
  "Giza": { nameAr: "الجيزة", cities: ["Giza City", "Dokki", "Mohandessin", "Haram", "Imbaba", "6th of October", "Sheikh Zayed", "Faysal"] },
  "Alexandria": { nameAr: "الإسكندرية", cities: ["Alexandria City", "Sidi Gaber", "Smouha", "Miami", "Montaza", "Borg El Arab", "Abu Qir"] },
  "Dakahlia": { nameAr: "الدقهلية", cities: ["Mansoura", "Talkha", "Mit Ghamr", "Belqas", "Aga", "Sherbin", "Dekernes"] },
  "Red Sea": { nameAr: "البحر الأحمر", cities: ["Hurghada", "Safaga", "El Quseir", "Marsa Alam", "Ras Gharib"] },
  "Beheira": { nameAr: "البحيرة", cities: ["Damanhur", "Kafr El Dawwar", "Rashid", "Edku", "Abu Hummus"] },
  "Fayoum": { nameAr: "الفيوم", cities: ["Fayoum City", "Ibsheway", "Sinnuris", "Tamiya", "Yusuf El Seddiq"] },
  "Gharbia": { nameAr: "الغربية", cities: ["Tanta", "El Mahalla El Kubra", "Kafr El Zayat", "Zefta", "El Sadat City"] },
  "Ismailia": { nameAr: "الإسماعيلية", cities: ["Ismailia City", "Fayed", "Qantara", "El Tal El Kabir"] },
  "Menofia": { nameAr: "المنوفية", cities: ["Shebin El Kom", "Menouf", "Ashmoun", "Quesna", "Sadat City", "Birket El Sab"] },
  "Minya": { nameAr: "المنيا", cities: ["Minya City", "Abu Qurqas", "Mallawi", "Maghagha", "Beni Mazar", "Matay"] },
  "Qalyubia": { nameAr: "القليوبية", cities: ["Banha", "Shubra El Kheima", "Qalyub", "Khanka", "Tukh", "Qaha"] },
  "New Valley": { nameAr: "الوادي الجديد", cities: ["Kharga", "Dakhla", "Farafra", "Baris"] },
  "Suez": { nameAr: "السويس", cities: ["Suez City", "Ain Sokhna", "Ataqah"] },
  "Aswan": { nameAr: "أسوان", cities: ["Aswan City", "Edfu", "Kom Ombo", "Abu Simbel", "Daraw"] },
  "Assiut": { nameAr: "أسيوط", cities: ["Assiut City", "Abnub", "Manfalut", "Dairut", "El Qusiya", "Sahel Selim"] },
  "Beni Suef": { nameAr: "بني سويف", cities: ["Beni Suef City", "El Fashn", "Beba", "Nasser", "Somsta"] },
  "Port Said": { nameAr: "بورسعيد", cities: ["Port Said City", "Port Fouad"] },
  "Damietta": { nameAr: "دمياط", cities: ["Damietta City", "Faraskur", "Kafr Saad", "New Damietta", "Ras El Bar"] },
  "Sharqia": { nameAr: "الشرقية", cities: ["Zagazig", "10th of Ramadan", "Belbeis", "Abu Hammad", "Minya El Qamh", "El Husseiniya"] },
  "South Sinai": { nameAr: "جنوب سيناء", cities: ["Sharm El Sheikh", "Dahab", "Nuweiba", "Taba", "Saint Catherine", "El Tor"] },
  "Kafr El Sheikh": { nameAr: "كفر الشيخ", cities: ["Kafr El Sheikh City", "Desouq", "Baltim", "Fouh", "Biala", "Sidi Salem"] },
  "Matrouh": { nameAr: "مطروح", cities: ["Marsa Matrouh", "Siwa", "El Alamein", "El Dabaa"] },
  "Luxor": { nameAr: "الأقصر", cities: ["Luxor City", "Esna", "El Qarna", "Armant"] },
  "Qena": { nameAr: "قنا", cities: ["Qena City", "Nag Hammadi", "Luxor", "Dishna", "Farshut"] },
  "North Sinai": { nameAr: "شمال سيناء", cities: ["Arish", "Rafah", "Sheikh Zuweid", "Bir El Abd"] },
  "Sohag": { nameAr: "سوهاج", cities: ["Sohag City", "Akhmim", "Tahta", "El Maragha", "Girga", "Juhayna"] },
};

const DEFAULT_SHIPPING = 80;

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState({
    fullName: "", phone: "", phone2: "",
    governorate: "", city: "", address: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [shippingRates, setShippingRates] = useState<Record<string, { cost: number; id: number }>>({});
  const [freeThreshold, setFreeThreshold] = useState(900);
  const [dbCities, setDbCities] = useState<{ name: string; name_ar: string; cost: number | null; is_active: boolean }[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}

    fetch(`${API_BASE}/shipping`)
      .then(r => r.json())
      .then(data => {
        if (data.rates) {
          const rateMap: Record<string, { cost: number; id: number }> = {};
          data.rates.forEach((r: any) => { rateMap[r.name] = { cost: r.cost, id: r.id }; });
          setShippingRates(rateMap);
        }
        if (data.free_threshold) setFreeThreshold(data.free_threshold);
      })
      .catch(() => {});
  }, []);

  // Fetch DB cities when governorate changes
  useEffect(() => {
    setDbCities([]);
    setLoadingCities(false);
    if (!form.governorate) return;
    const govData = shippingRates[form.governorate];
    if (!govData) return;
    setLoadingCities(true);
    fetch(`${API_BASE}/shipping/${govData.id}/cities`)
      .then(r => r.json())
      .then(data => {
        const activeCities = (data.cities || []).filter((c: any) => c.is_active);
        setDbCities(activeCities);
      })
      .catch(() => {})
      .finally(() => setLoadingCities(false));
  }, [form.governorate, shippingRates]);

  const removeItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const govShipping = form.governorate ? (shippingRates[form.governorate]?.cost ?? DEFAULT_SHIPPING) : DEFAULT_SHIPPING;

  // City-level cost: if selected city has its own cost use it, else use governorate cost
  const selectedCityData = dbCities.find(c => c.name === form.city);
  const cityShipping = selectedCityData?.cost !== null && selectedCityData?.cost !== undefined
    ? selectedCityData.cost
    : govShipping;

  const activeShipping = form.city ? cityShipping : govShipping;
  const freeShipping = subtotal >= freeThreshold;
  const shippingCost = freeShipping ? 0 : activeShipping;
  const finalTotal = subtotal + shippingCost;

  // Use DB cities if available, else fallback to EGYPT_DATA
  const cities = form.governorate
    ? (dbCities.length > 0 ? dbCities.map(c => c.name) : (EGYPT_DATA[form.governorate]?.cities || []))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (cart.length === 0) { setErrorMsg("Your cart is empty!"); return; }
    if (!form.fullName.trim()) { setErrorMsg("Please enter your full name"); return; }
    if (!form.phone.trim() || form.phone.length < 10) { setErrorMsg("Please enter a valid phone number (10+ digits)"); return; }
    if (!form.phone2.trim() || form.phone2.length < 10) { setErrorMsg("Please enter WhatsApp number for deposit confirmation"); return; }
    if (!form.governorate) { setErrorMsg("Please select your governorate"); return; }
    if (!form.city) { setErrorMsg("Please select your city"); return; }
    if (!form.address.trim()) { setErrorMsg("Please enter your address"); return; }

    setSubmitting(true);
    try {
      const payload = {
        customer_name: form.fullName.trim(),
        customer_phone: form.phone.trim(),
        phone2: form.phone2.trim() || null,
        shipping_address: `${form.address}, ${form.city}, ${form.governorate}`,
        customer_city: form.city,
        city: form.city,
        governorate: form.governorate,
        address: form.address.trim(),
        notes: form.notes.trim() || null,
        shipping_cost: shippingCost,
        subtotal,
        total_amount: finalTotal,
        payment_method: "cash_on_delivery",
        status: "pending",
        items: cart.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name_en,
          quantity: i.qty,
          price: i.product.price,
          size: i.size,
          total: i.product.price * i.qty,
        })),
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderId(data.order?.id || data.id || "");
        localStorage.removeItem("cart");
        window.dispatchEvent(new Event("cartUpdated"));
        setSuccess(true);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || err.message || "Failed to place order");
      }
    } catch (err: any) {
      setErrorMsg("Network error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 48, textAlign: "center", maxWidth: 480, boxShadow: "0 8px 40px rgba(253,161,183,0.2)" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: "#1a1a2e", fontSize: 26, fontWeight: 800, margin: "0 0 12px" }}>Order Placed!</h2>
        {orderId && <p style={{ color: "#888", margin: "0 0 8px" }}>Order #{orderId.slice(-6)}</p>}
        <p style={{ color: "#555", fontSize: 15, margin: "0 0 24px" }}>Thank you {form.fullName}! We'll contact you on {form.phone} to confirm.</p>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", marginBottom: 24, textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: "#888", fontSize: 13 }}>Subtotal</span><span style={{ fontWeight: 600 }}>{subtotal} EGP</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: "#888", fontSize: 13 }}>Shipping to {form.governorate}</span><span style={{ fontWeight: 600 }}>{shippingCost === 0 ? "FREE 🎉" : `${shippingCost} EGP`}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontWeight: 800, color: "#fda1b7", fontSize: 18 }}>{finalTotal} EGP</span></div>
        </div>
        <Link href="/" style={{ display: "block", padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
          Continue Shopping →
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#f9f0f3", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 40px" }}>
        <h1 className="checkout-title" style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", margin: "0 0 20px" }}>🛒 Checkout</h1>

        <div className="checkout-grid">

          {/* Order Summary - يظهر فوق في الموبايل */}
          <div className="checkout-summary">
            <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(253,161,183,0.1)" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>📦 Order Summary</h3>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "#aaa" }}>
                  <div style={{ fontSize: 36 }}>🛒</div>
                  <p style={{ margin: "8px 0" }}>Cart is empty</p>
                  <Link href="/shop" style={{ color: "#fda1b7", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>← Go Shopping</Link>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    {cart.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #fdf0f3", alignItems: "center" }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#fdf0f3" }}>
                          {item.product.image_url
                            ? <img src={item.product.image_url} alt={item.product.name_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>💍</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.name_en}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>x{item.qty}{item.size && item.size !== "One Size" ? ` · ${item.size}` : ""}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: "#fda1b7", fontSize: 13 }}>{item.product.price * item.qty} EGP</div>
                        <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#bbb", fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }} title="Remove">×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid #fdf0f3", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#888" }}>Subtotal</span>
                      <span style={{ fontWeight: 600 }}>{subtotal} EGP</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#888" }}>Shipping {form.governorate ? `(${form.governorate})` : ""}</span>
                      <span style={{ fontWeight: 600, color: freeShipping ? "#22c55e" : "#333" }}>{freeShipping ? "FREE 🎉" : `${shippingCost} EGP`}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "2px solid #fda1b7", marginTop: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>Total</span>
                      <span style={{ fontWeight: 800, fontSize: 18, color: "#fda1b7" }}>{finalTotal} EGP</span>
                    </div>
                    <div style={{ background: "#fef3c7", borderRadius: 8, padding: "8px 12px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#92400e" }}>
                      💵 Cash on Delivery
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="checkout-form">
            <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(253,161,183,0.1)" }}>
              <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>📋 Delivery Details</h2>

              {errorMsg && <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 10, padding: 12, marginBottom: 14, color: "#ef4444", fontWeight: 600, fontSize: 13 }}>⚠️ {errorMsg}</div>}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                <div className="form-row">
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Your full name" style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone *</label>
                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))} placeholder="01XXXXXXXXX" style={inputStyle} required maxLength={11} inputMode="numeric" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>WhatsApp Number * <span style={{ color: "#fda1b7", fontSize: 11 }}>(for deposit confirmation)</span></label>
                  <input value={form.phone2} onChange={e => setForm(p => ({ ...p, phone2: e.target.value.replace(/\D/g, "") }))} placeholder="01XXXXXXXXX" style={inputStyle} maxLength={11} required inputMode="numeric" />
                </div>

                <div className="form-row">
                  <div>
                    <label style={labelStyle}>Governorate *</label>
                    <select value={form.governorate} onChange={e => setForm(p => ({ ...p, governorate: e.target.value, city: "" }))} style={{ ...inputStyle, cursor: "pointer" }} required>
                      <option value="">Select Governorate</option>
                      {Object.keys(shippingRates).length > 0
                        ? Object.entries(shippingRates).map(([name]) => {
                            const ar = EGYPT_DATA[name]?.nameAr || "";
                            return <option key={name} value={name}>{name}{ar ? ` — ${ar}` : ""}</option>;
                          })
                        : Object.entries(EGYPT_DATA).map(([key, val]) => (
                            <option key={key} value={key}>{key} — {val.nameAr}</option>
                          ))
                      }
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>City *</label>
                    <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }} required disabled={!form.governorate}>
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {form.governorate && (
                  <div style={{ background: freeShipping ? "#dcfce7" : "#fef4f0", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${freeShipping ? "#bbf7d0" : "#f0d4dc"}` }}>
                    <span>{freeShipping ? "🎉" : "🚚"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: freeShipping ? "#166534" : "#555" }}>
                      {freeShipping ? "Free shipping!" : `Shipping to ${form.governorate}: ${govShipping} EGP`}
                    </span>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Street Address *</label>
                  <p style={{ margin: "0 0 6px", fontSize: 13, color: "#c0185a", direction: "rtl", textAlign: "right", fontFamily: "Cairo, Tahoma, sans-serif" }}>برجاء الكتابة باللغة العربية</p>
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="العنوان بالعربية" style={{ ...inputStyle, direction: "rtl" }} required />
                </div>

                <div>
                  <label style={labelStyle}>Notes (optional)</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special instructions..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>

                <button type="submit" disabled={submitting || cart.length === 0}
                  style={{ padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
                  {submitting ? "Placing Order..." : `Place Order — ${finalTotal} EGP`}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        html, body { overflow-x: hidden; }
        .checkout-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }
        .checkout-summary { order: 2; }
        .checkout-form { order: 1; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        @media (max-width: 700px) {
          .checkout-grid { grid-template-columns: 1fr; }
          .checkout-summary { order: 1; }
          .checkout-form { order: 2; }
          .form-row { grid-template-columns: 1fr; }
          .checkout-title { font-size: 18px !important; }
        }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#666", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #f0d4dc", fontSize: 16, outline: "none", boxSizing: "border-box", background: "#fff" };