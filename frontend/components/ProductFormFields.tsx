"use client";

import React from "react";

interface Category {
  id: string;
  name_en: string;
  slug: string;
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

export default function ProductFormFields({
  form, onChange, formId, categories, uploadingImage, onUploadImage
}: ProductFormFieldsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

      <div>
        <label style={labelStyle}>Name (English) *</label>
        <input
          type="text"
          value={form.name_en}
          onChange={e => onChange("name_en", e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Name (Arabic)</label>
        <input
          type="text"
          value={form.name_ar}
          onChange={e => onChange("name_ar", e.target.value)}
          style={{ ...inputStyle, direction: "rtl" }}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Description (English)</label>
        <textarea
          value={form.description_en}
          onChange={e => onChange("description_en", e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Description (Arabic)</label>
        <textarea
          value={form.description_ar}
          onChange={e => onChange("description_ar", e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", direction: "rtl" }}
        />
      </div>

      <div>
        <label style={labelStyle}>Price (EGP) *</label>
        <input
          type="number"
          value={form.price}
          onChange={e => onChange("price", e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Old Price (EGP)</label>
        <input
          type="number"
          value={form.old_price}
          onChange={e => onChange("old_price", e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Stock *</label>
        <input
          type="number"
          value={form.stock}
          onChange={e => onChange("stock", e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Material</label>
        <input
          type="text"
          value={form.material}
          onChange={e => onChange("material", e.target.value)}
          placeholder="Gold, Silver, Stainless Steel..."
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Category</label>
        <select
          value={form.category_id}
          onChange={e => onChange("category_id", e.target.value)}
          style={inputStyle}
        >
          <option value="">— No Category —</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name_en}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Water Resistance</label>
        <input
          type="text"
          value={form.water_resistance}
          onChange={e => onChange("water_resistance", e.target.value)}
          placeholder="e.g. 30m, 50m"
          style={inputStyle}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Size Info</label>
        <input
          type="text"
          value={form.size_info}
          onChange={e => onChange("size_info", e.target.value)}
          placeholder="Adjustable, One Size, 16cm..."
          style={inputStyle}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Product Image</label>
        <input
          type="text"
          value={form.main_image}
          onChange={e => onChange("main_image", e.target.value)}
          placeholder="https://... or upload below"
          style={{ ...inputStyle, marginBottom: 8 }}
        />
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 16px", borderRadius: 8, border: "2px dashed #fda1b7",
          cursor: uploadingImage ? "not-allowed" : "pointer",
          color: "#fda1b7", fontWeight: 600, fontSize: 13,
          opacity: uploadingImage ? 0.6 : 1,
        }}>
          {uploadingImage ? "⏳ Uploading..." : "📤 Upload Image from Device"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={uploadingImage}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(file);
            }}
          />
        </label>
        {form.main_image && (
          <div style={{ marginTop: 10 }}>
            <img
              src={form.main_image.startsWith("http") ? form.main_image : `${process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com"}${form.main_image}`}
              alt="Preview"
              style={{ width: 100, height: 100, borderRadius: 10, objectFit: "cover", border: "2px solid #fda1b7" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
      </div>

      <div style={{
        gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", background: "#fff", borderRadius: 10
      }}>
        <input
          type="checkbox"
          id={`${formId}_is_active`}
          checked={form.is_active}
          onChange={e => onChange("is_active", e.target.checked)}
          style={{ width: 20, height: 20, cursor: "pointer" }}
        />
        <label htmlFor={`${formId}_is_active`} style={{ fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Product is Active (visible on store)
        </label>
        <span style={{ marginLeft: "auto", fontSize: 12, color: form.is_active ? "#22c55e" : "#6b7280", fontWeight: 700 }}>
          {form.is_active ? "● ACTIVE" : "○ DRAFT"}
        </span>
      </div>
    </div>
  );
}
