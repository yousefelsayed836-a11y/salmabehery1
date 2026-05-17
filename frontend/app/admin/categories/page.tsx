"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";
const BACKEND = process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com";

interface Category {
  id: string;
  name_en: string;
  slug: string;
  image?: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY = { name_en: "", slug: "", image: "", sort_order: 0 };

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchCats(); }, []);

  const fetchCats = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/categories?admin=true`);
      const data = await r.json();
      setCats(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const startEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name_en: cat.name_en, slug: cat.slug, image: cat.image || "", sort_order: cat.sort_order });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const cancel = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await fetch(`${API.replace("/api", "")}/api/upload`, { method: "POST", body: fd });
      const data = await r.json();
      if (data.url) setForm(f => ({ ...f, image: data.url }));
    } catch { flash("Upload failed"); }
    setUploading(false);
  };

  const save = async () => {
    if (!form.name_en.trim()) return flash("Name is required");
    setSaving(true);
    try {
      const slug = form.slug || autoSlug(form.name_en);
      const body = { ...form, slug };
      const url = editing ? `${API}/categories/${editing.id}` : `${API}/categories`;
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      flash(editing ? "Updated!" : "Created!");
      cancel();
      fetchCats();
    } catch (e: any) { flash(e.message || "Error"); }
    setSaving(false);
  };

  const toggleActive = async (cat: Category) => {
    await fetch(`${API}/categories/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cat, is_active: !cat.is_active }),
    });
    fetchCats();
  };

  const deleteCat = async (id: string) => {
    await fetch(`${API}/categories/${id}`, { method: "DELETE" });
    flash("Deleted");
    fetchCats();
  };

  const imgSrc = (img?: string) => {
    if (!img) return null;
    return img.startsWith("http") ? img : `${BACKEND}${img}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: 20 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <Link href="/admin" style={{ color: "#fda1b7", textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>
            <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>🗂️ Categories</h1>
          </div>
          <button onClick={startAdd} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            + Add Category
          </button>
        </div>

        {msg && <div style={{ background: msg.includes("!") ? "#dcfce7" : "#fee2e2", color: msg.includes("!") ? "#166534" : "#991b1b", padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>{msg}</div>}

        {/* Form */}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h3 style={{ margin: "0 0 20px", color: "#1a1a2e" }}>{editing ? "Edit Category" : "New Category"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Category Name *</label>
                <input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value, slug: f.slug || autoSlug(e.target.value) }))}
                  placeholder="e.g. Rings" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Slug (URL)</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="e.g. rings" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Image</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  placeholder="Paste image URL or upload below" style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none" }} />
                <label style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px dashed #fda1b7", color: "#fda1b7", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {uploading ? "Uploading..." : "Upload"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                </label>
              </div>
              {form.image && <img src={imgSrc(form.image) || ""} alt="" style={{ marginTop: 10, width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: "1px solid #eee" }} onError={e => (e.target as HTMLImageElement).style.display = "none"} />}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                style={{ width: 100, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eee", fontSize: 14, outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={save} disabled={saving} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create"}
              </button>
              <button onClick={cancel} style={{ padding: "12px 20px", borderRadius: 12, border: "1.5px solid #eee", background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
        ) : cats.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#999", background: "#fff", borderRadius: 16 }}>
            <p style={{ fontSize: 16 }}>No categories yet. Add your first one!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cats.map(cat => (
              <div key={cat.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", opacity: cat.is_active ? 1 : 0.55 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: "#f9f0f3", flexShrink: 0 }}>
                  {cat.image ? <img src={imgSrc(cat.image) || ""} alt={cat.name_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 20 }}>🖼️</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{cat.name_en}</div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>/{cat.slug} · order: {cat.sort_order}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: cat.is_active ? "#dcfce7" : "#f3f4f6", color: cat.is_active ? "#166534" : "#6b7280" }}>
                    {cat.is_active ? "Active" : "Hidden"}
                  </span>
                  <button onClick={() => toggleActive(cat)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #eee", background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#555" }}>
                    {cat.is_active ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => startEdit(cat)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#fdf0f3", color: "#fda1b7", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Edit
                  </button>
                  <button onClick={() => deleteCat(cat.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
