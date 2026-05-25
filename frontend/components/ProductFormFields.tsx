"use client";

import React, { useState } from "react";

interface Category { id: string; name_en: string; slug: string; }

interface Variant {
  id?: number;
  option_name: string;
  option_value: string;
  quantity: number;
  price_override: number | null;
}

interface ProductFormFieldsProps {
  form: any;
  onChange: (field: string, value: any) => void;
  formId: string;
  categories: Category[];
  uploadingImage: boolean;
  onUploadImages: (files: File[]) => void;
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 6
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box"
};

const emptyVariant = (): Variant => ({ option_name: "Size", option_value: "", quantity: 0, price_override: null });

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com";

export default function ProductFormFields({ form, onChange, formId, categories, uploadingImage, onUploadImages }: ProductFormFieldsProps) {
  const selectedIds: string[] = Array.isArray(form.category_ids) ? form.category_ids : form.category_id ? [form.category_id] : [];
  const variants: Variant[] = Array.isArray(form.variants) ? form.variants : [];

  const [newVariant, setNewVariant] = useState<Variant>(emptyVariant());

  const toggleCategory = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onChange("category_ids", next);
    onChange("category_id", next[0] || "");
  };

  const addVariant = () => {
    if (!newVariant.option_value.trim()) return;
    onChange("variants", [...variants, { ...newVariant }]);
    setNewVariant(emptyVariant());
  };

  const removeVariant = (i: number) => {
    onChange("variants", variants.filter((_, idx) => idx !== i));
  };

  const updateVariant = (i: number, field: keyof Variant, value: any) => {
    const updated = variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v);
    onChange("variants", updated);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

      <div>
        <label style={labelStyle}>Name (English) *</label>
        <input type="text" value={form.name_en} onChange={e => onChange("name_en", e.target.value)} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Name (Arabic)</label>
        <input type="text" value={form.name_ar} onChange={e => onChange("name_ar", e.target.value)} style={{ ...inputStyle, direction: "rtl" }} />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Description (English)</label>
        <textarea value={form.description_en} onChange={e => onChange("description_en", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <div>
        <label style={labelStyle}>Price (EGP) *</label>
        <input type="number" value={form.price} onChange={e => onChange("price", e.target.value)} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Old Price (EGP)</label>
        <input type="number" value={form.old_price} onChange={e => onChange("old_price", e.target.value)} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Stock *</label>
        <input type="number" value={form.stock} onChange={e => onChange("stock", e.target.value)} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Material</label>
        <input type="text" value={form.material} onChange={e => onChange("material", e.target.value)} placeholder="Gold, Silver, Stainless Steel..." style={inputStyle} />
      </div>

      {/* Multi-select categories */}
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Collections</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, background: "#fafafa" }}>
          {categories.map(cat => {
            const selected = selectedIds.includes(cat.id);
            return (
              <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)} style={{
                padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                background: selected ? "#fda1b7" : "#e5e7eb", color: selected ? "#fff" : "#555",
              }}>
                {selected ? "✓ " : ""}{cat.name_en}
              </button>
            );
          })}
          {categories.length === 0 && <span style={{ color: "#aaa", fontSize: 13 }}>Loading categories...</span>}
        </div>
        {selectedIds.length > 0 && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>Selected: {selectedIds.length} collection{selectedIds.length > 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Product Images — multi-upload */}
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Product Images</label>

        {/* Thumbnails grid */}
        {(form.images as string[] || []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {(form.images as string[]).map((img: string, i: number) => {
              const src = (img.startsWith("http") || img.startsWith("data:")) ? img : `${BACKEND_URL}${img}`;
              return (
                <div key={i} style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
                  <img src={src} alt=""
                    style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 10,
                      border: `2px solid ${i === 0 ? "#fda1b7" : "#ddd"}` }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                  {i === 0 && (
                    <span style={{ position: "absolute", bottom: 4, left: 4, background: "#fda1b7",
                      color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 4,
                      letterSpacing: 0.5 }}>MAIN</span>
                  )}
                  <button type="button" onClick={() => {
                    const next = (form.images as string[]).filter((_: string, idx: number) => idx !== i);
                    onChange("images", next);
                    onChange("main_image", next[0] || "");
                  }} style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20,
                    borderRadius: "50%", border: "none", background: "#ef4444", color: "#fff",
                    fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", padding: 0, lineHeight: 1 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px",
          borderRadius: 8, border: "2px dashed #fda1b7",
          cursor: uploadingImage ? "not-allowed" : "pointer",
          color: "#fda1b7", fontWeight: 600, fontSize: 13, opacity: uploadingImage ? 0.6 : 1 }}>
          {uploadingImage ? "⏳ Uploading..." : "📤 Add Images"}
          <input type="file" accept="image/*" multiple style={{ display: "none" }}
            disabled={uploadingImage}
            onChange={e => {
              const files = Array.from(e.target.files || []);
              if (files.length) onUploadImages(files);
              e.currentTarget.value = "";
            }} />
        </label>
        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#aaa" }}>
          First image = main. Click ✕ to remove. Multiple files allowed.
        </p>
      </div>

      {/* ── VARIANTS ── */}
      <div style={{ gridColumn: "1 / -1", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" as const }}>Configure Variants</span>
          <button type="button" onClick={addVariant}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#1a1a2e" }}>
            + Add Variant
          </button>
        </div>

        {/* Add row */}
        <div className="variant-add-grid" style={{ padding: "12px 16px", background: "#fff", borderBottom: variants.length > 0 ? "1px solid #e5e7eb" : "none" }}>
          <div>
            <label style={{ ...labelStyle, fontSize: 11 }}>Type</label>
            <input value={newVariant.option_name} onChange={e => setNewVariant(v => ({ ...v, option_name: e.target.value }))}
              placeholder="Size / Color"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: 11 }}>Value</label>
            <input value={newVariant.option_value} onChange={e => setNewVariant(v => ({ ...v, option_value: e.target.value }))}
              placeholder="S / M / Gold"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: 11 }}>Price (EGP)</label>
            <input type="number" value={newVariant.price_override ?? ""} onChange={e => setNewVariant(v => ({ ...v, price_override: e.target.value ? parseFloat(e.target.value) : null }))}
              placeholder="—"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: 11 }}>Quantity</label>
            <input type="number" value={newVariant.quantity} onChange={e => setNewVariant(v => ({ ...v, quantity: parseInt(e.target.value) || 0 }))}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div className="variant-add-btn-wrap">
            <button type="button" onClick={addVariant}
              style={{ width: "100%", padding: "8px 0", background: "#fda1b7", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Add
            </button>
          </div>
        </div>

        {/* Existing variants */}
        {variants.length > 0 && (
          <>
            {/* Column headers – desktop only */}
            <div className="variant-header-row" style={{ display: "grid", gridTemplateColumns: "32px 1fr 120px 100px 60px", gap: 8, padding: "8px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <div />
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Variant</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Price (EGP)</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Quantity</div>
              <div />
            </div>
            {variants.map((v, i) => (
              <div key={i} className="variant-row" style={{ borderBottom: i < variants.length - 1 ? "1px solid #f3f4f6" : "none", background: "#fff" }}>
                {/* Desktop layout */}
                <div className="variant-row-desktop" style={{ display: "grid", gridTemplateColumns: "32px 1fr 120px 100px 60px", gap: 8, padding: "12px 16px", alignItems: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏷</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <input value={v.option_value} onChange={e => updateVariant(i, "option_value", e.target.value)}
                      style={{ padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, fontWeight: 600, width: "100%", boxSizing: "border-box" as const }} />
                    <input value={v.option_name} onChange={e => updateVariant(i, "option_name", e.target.value)}
                      style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, color: "#6b7280", width: "100%", boxSizing: "border-box" as const }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input type="number" value={v.price_override ?? ""} onChange={e => updateVariant(i, "price_override", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="—" style={{ width: "100%", padding: "8px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
                  </div>
                  <div>
                    <input type="number" value={v.quantity} onChange={e => updateVariant(i, "quantity", parseInt(e.target.value) || 0)}
                      style={{ width: "100%", padding: "8px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
                  </div>
                  <button type="button" onClick={() => removeVariant(i)}
                    style={{ padding: "6px 8px", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#ef4444" }}>
                    ✕
                  </button>
                </div>

                {/* Mobile card layout */}
                <div className="variant-row-mobile" style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🏷</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <input value={v.option_value} onChange={e => updateVariant(i, "option_value", e.target.value)}
                          placeholder="Value"
                          style={{ padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, fontWeight: 600, width: 120, boxSizing: "border-box" as const }} />
                        <input value={v.option_name} onChange={e => updateVariant(i, "option_name", e.target.value)}
                          placeholder="Type"
                          style={{ padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, color: "#6b7280", width: 120, boxSizing: "border-box" as const }} />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeVariant(i)}
                      style={{ padding: "6px 10px", background: "none", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#ef4444", flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10 }}>Price (EGP)</label>
                      <input type="number" value={v.price_override ?? ""} onChange={e => updateVariant(i, "price_override", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="—" style={{ width: "100%", padding: "8px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10 }}>Quantity</label>
                      <input type="number" value={v.quantity} onChange={e => updateVariant(i, "quantity", parseInt(e.target.value) || 0)}
                        style={{ width: "100%", padding: "8px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <style jsx global>{`
        .variant-add-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 110px 110px 90px;
          gap: 8px;
          align-items: end;
        }
        .variant-row-mobile { display: none; }
        @media (max-width: 600px) {
          .variant-add-grid {
            grid-template-columns: 1fr 1fr;
          }
          .variant-add-btn-wrap {
            grid-column: 1 / -1;
            padding-top: 4px;
          }
          .variant-header-row { display: none !important; }
          .variant-row-desktop { display: none !important; }
          .variant-row-mobile { display: block; }
        }
      `}</style>

      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderRadius: 10 }}>
        <input type="checkbox" id={`${formId}_is_active`} checked={form.is_active} onChange={e => onChange("is_active", e.target.checked)} style={{ width: 20, height: 20, cursor: "pointer" }} />
        <label htmlFor={`${formId}_is_active`} style={{ fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Product is Active (visible on store)</label>
        <span style={{ marginLeft: "auto", fontSize: 12, color: form.is_active ? "#22c55e" : "#6b7280", fontWeight: 700 }}>
          {form.is_active ? "● ACTIVE" : "○ DRAFT"}
        </span>
      </div>
    </div>
  );
}
