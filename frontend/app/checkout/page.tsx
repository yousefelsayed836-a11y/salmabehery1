"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CartItem {
  product: { id: string; name_en: string; price: number; image_url?: string; };
  qty: number;
  size: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";

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
const STORAGE_KEY = "shipping_rates";

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
  const [shippingRates, setShippingRates] = useState<Record<string, number>>({});
  const [freeThreshold, setFreeThreshold] = useState(900);

  useEffect(() => {
    // Load cart
    try {
      const saved = localStorage.getItem("cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}

    // Load shipping rates from admin settings
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.rates) {
          const rateMap: Record<string, number> = {};
          parsed.rates.forEach((r: any) => { rateMap[r.name] = r.cost; });
          setShippingRates(rateMap);
        }
        if (parsed.freeThreshold) setFreeThreshold(parsed.freeThreshold);
      }
    } catch {}
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const govShipping = form.governorate ? (shippingRates[form.governorate] ?? DEFAULT_SHIPPING) : DEFAULT_SHIPPING;
  const freeShipping = subtotal >= freeThreshold;
  const shippingCost = freeShipping ? 0 : govShipping;
  const finalTotal = subtotal + shippingCost;

  const cities = form.governorate ? (EGYPT_DATA[form.governorate]?.cities || []) : [];

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
    <div style={{ background: "#fff", minHeight: "100vh", padding: "32px 16px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "0 0 24px" }}>🛒 Checkout</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
          {/* Form */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 4px 20px rgba(253,161,183,0.1)" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>📋 Delivery Details</h2>

            {errorMsg && <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 10, padding: 12, marginBottom: 16, color: "#ef4444", fontWeight: 600 }}>⚠️ {errorMsg}</div>}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Your full name" style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Phone *</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))} placeholder="01XXXXXXXXX" style={inputStyle} required maxLength={11} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>WhatsApp Number * <span style={{ color: "#fda1b7", fontSize: 11 }}>(for deposit confirmation)</span></label>
                <input value={form.phone2} onChange={e => setForm(p => ({ ...p, phone2: e.target.value.replace(/\D/g, "") }))} placeholder="WhatsApp number for deposit confirmation" style={inputStyle} maxLength={11} required />
              </div>

              {/* ✅ Governorate + City */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Governorate *</label>
                  <select value={form.governorate} onChange={e => setForm(p => ({ ...p, governorate: e.target.value, city: "" }))} style={{ ...inputStyle, cursor: "pointer" }} required>
                    <option value="">Select Governorate</option>
                    {Object.entries(EGYPT_DATA).map(([key, val]) => (
                      <option key={key} value={key}>{key} — {val.nameAr}</option>
                    ))}
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

              {/* Shipping cost indicator */}
              {form.governorate && (
                <div style={{ background: freeShipping ? "#dcfce7" : "#fef4f0", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, border: `1px solid ${freeShipping ? "#bbf7d0" : "#f0d4dc"}` }}>
                  <span style={{ fontSize: 18 }}>{freeShipping ? "🎉" : "🚚"}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: freeShipping ? "#166534" : "#555" }}>
                    {freeShipping ? "Free shipping!" : `Shipping to ${form.governorate}: ${govShipping} EGP`}
                  </span>
                </div>
              )}

              <div>
                <label style={labelStyle}>Street Address *</label>
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Street, building, apartment..." style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special instructions..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <button type="submit" disabled={submitting || cart.length === 0}
                style={{ padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Placing Order..." : `Place Order — ${finalTotal} EGP`}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(253,161,183,0.1)", position: "sticky", top: 80 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>📦 Order Summary</h3>

              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "#aaa" }}>
                  <div style={{ fontSize: 40 }}>🛒</div>
                  <p>Cart is empty</p>
                  <Link href="/shop" style={{ color: "#fda1b7", fontWeight: 600, textDecoration: "none" }}>← Go Shopping</Link>
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 16 }}>
                    {cart.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #fdf0f3" }}>
                        <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#fff" }}>
                          {item.product.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💍</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.name_en}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>Qty: {item.qty}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: "#fda1b7", fontSize: 13, flexShrink: 0 }}>{item.product.price * item.qty} EGP</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "2px solid #fdf0f3", paddingTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: "#888", fontSize: 14 }}>Subtotal</span>
                      <span style={{ fontWeight: 600 }}>{subtotal} EGP</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                      <span style={{ color: "#888", fontSize: 14 }}>Shipping {form.governorate ? `(${form.governorate})` : ""}</span>
                      <span style={{ fontWeight: 600, color: freeShipping ? "#22c55e" : "#333" }}>{freeShipping ? "FREE 🎉" : `${shippingCost} EGP`}</span>
                    </div>
                    {!freeShipping && subtotal > 0 && (
                      <div style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#888", textAlign: "center" }}>
                        Add {freeThreshold - subtotal} EGP more for free shipping!
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #fda1b7" }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
                      <span style={{ fontWeight: 800, fontSize: 20, color: "#fda1b7" }}>{finalTotal} EGP</span>
                    </div>
                    <div style={{ background: "#fef3c7", borderRadius: 10, padding: "10px 14px", marginTop: 8, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                      💵 Cash on Delivery
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 380px"] { grid-template-columns: 1fr !important; }
          div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #f0d4dc", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };