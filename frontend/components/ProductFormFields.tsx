"use client";

import React from "react";

interface Category { id: string; name_en: string; slug: string; }

export interface Variant {
  option_name: string;
  option_value: string;
  quantity: number;
  price_override: number | null;
  sku: string;
}

interface ProductFormFieldsProps {
  form: any;
  onChange: (field: string, value: any) => void;
  formId: string;
  categories: Category[];
  uploadingImage: boolean;
  onUploadImage: (file: File) => void;
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 6
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box"
};

export default function ProductFormFields({ form, onChange, formId, categories, uploadingImage, onUploadImage }: ProductFormFieldsProps) {
  const selectedIds: string[] = Array.isArray(form.category_ids) ? form.category_ids : form.category_id ? [form.category_id] : [];

  const toggleCategory = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onChange("category_ids", next);
    onChange("category_id", next[0] || "");
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
        <label style={labelStyle}>Collections (ممكن تختار أكتر من كوليكشن)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, background: "#fafafa" }}>
          {categories.map(cat => {
            const selected = selectedIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                  background: selected ? "#fda1b7" : "#e5e7eb",
                  color: selected ? "#fff" : "#555",
                }}
              >
                {selected ? "✓ " : ""}{cat.name_en}
              </button>
            );
          })}
          {categories.length === 0 && <span style={{ color: "#aaa", fontSize: 13 }}>Loading categories...</span>}
        </div>
        {selectedIds.length > 0 && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>
            Selected: {selectedIds.length} collection{selectedIds.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Product Image</label>
        <input type="text" value={form.main_image} onChange={e => onChange("main_image", e.target.value)} placeholder="https://... or upload below" style={{ ...inputStyle, marginBottom: 8 }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "2px dashed #fda1b7", cursor: uploadingImage ? "not-allowed" : "pointer", color: "#fda1b7", fontWeight: 600, fontSize: 13, opacity: uploadingImage ? 0.6 : 1 }}>
          {uploadingImage ? "⏳ Uploading..." : "📤 Upload Image"}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadingImage} onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(f); }} />
        </label>
        {form.main_image && (
          <div style={{ marginTop: 10 }}>
            <img src={form.main_image.startsWith("http") ? form.main_image : `${process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com"}${form.main_image}`}
              alt="Preview" style={{ width: 100, height: 100, borderRadius: 10, objectFit: "cover", border: "2px solid #fda1b7" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </div>

      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderRadius: 10 }}>
        <input type="checkbox" id={`${formId}_is_active`} checked={form.is_active} onChange={e => onChange("is_active", e.target.checked)} style={{ width: 20, height: 20, cursor: "pointer" }} />
        <label htmlFor={`${formId}_is_active`} style={{ fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Product is Active (visible on store)</label>
        <span style={{ marginLeft: "auto", fontSize: 12, color: form.is_active ? "#22c55e" : "#6b7280", fontWeight: 700 }}>
          {form.is_active ? "● ACTIVE" : "○ DRAFT"}
        </span>
      </div>

      {/* ===== Variants Section ===== */}
      <div style={{ gridColumn: "1 / -1", borderRadius: 12, border: "1.5px solid #fce7ef", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff0f5" }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#9d174d" }}>🎨 المتغيرات (Variants)</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: "#888" }}>
              {(form.variants || []).length > 0 ? `${(form.variants || []).length} variant` : "No variants"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const v: Variant = { option_name: "", option_value: "", quantity: 1, price_override: null, sku: "" };
              onChange("variants", [...(form.variants || []), v]);
            }}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#fda1b7", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            + Add Variant
          </button>
        </div>

        {(form.variants || []).length > 0 && (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 100px 90px 36px", gap: 8, padding: "0 4px" }}>
              {["Option Name", "Value", "Qty", "Price Override", "SKU", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>{h}</span>
              ))}
            </div>
            {(form.variants as Variant[]).map((v, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 100px 90px 36px", gap: 8, alignItems: "center", background: "#fafafa", borderRadius: 8, padding: "8px" }}>
                <input
                  value={v.option_name}
                  onChange={e => { const u = [...form.variants]; u[i] = { ...u[i], option_name: e.target.value }; onChange("variants", u); }}
                  placeholder="e.g. Color"
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                />
                <input
                  value={v.option_value}
                  onChange={e => { const u = [...form.variants]; u[i] = { ...u[i], option_value: e.target.value }; onChange("variants", u); }}
                  placeholder="e.g. Red"
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                />
                <input
                  type="number" value={v.quantity} min={0}
                  onChange={e => { const u = [...form.variants]; u[i] = { ...u[i], quantity: Number(e.target.value) }; onChange("variants", u); }}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                />
                <input
                  type="number" value={v.price_override ?? ""} min={0}
                  onChange={e => { const u = [...form.variants]; u[i] = { ...u[i], price_override: e.target.value ? Number(e.target.value) : null }; onChange("variants", u); }}
                  placeholder="Optional"
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                />
                <input
                  value={v.sku}
                  onChange={e => { const u = [...form.variants]; u[i] = { ...u[i], sku: e.target.value }; onChange("variants", u); }}
                  placeholder="SKU"
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, width: "100%", boxSizing: "border-box" as const }}
                />
                <button
                  type="button"
                  onClick={() => onChange("variants", (form.variants as Variant[]).filter((_, j) => j !== i))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#fee2e2", color: "#ef4444", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
