"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProductFormFields from "@/components/ProductFormFields";

interface Category { id: string; name_en: string; slug: string; }
interface Variant { option_name: string; option_value: string; quantity: number; price_override: number | null; }
interface Product {
  id: string; name_en: string; name_ar?: string; description_en?: string; description_ar?: string;
  price: number; old_price?: number; stock: number; material?: string; is_active: boolean;
  images?: string[]; main_image?: string; image_url?: string; category_id?: string;
  category_name?: string; water_resistance?: string; size_info?: string;
  categories?: { id: string; name_en: string; slug: string }[];
  category_ids?: string[];
  variants?: Variant[];
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com") + "/api";

function getProductImage(p: Product) {
  const img = p.main_image || (p.images && p.images[0]) || p.image_url;
  if (!img) return "https://placehold.co/60x60/fda1b7/fff?text=??";
  if (img.startsWith("http")) return img;
  return `${process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com"}${img}`;
}

const emptyForm = {
  name_en: "", name_ar: "", description_en: "", description_ar: "",
  price: "", old_price: "", stock: "", material: "", main_image: "",
  images: [] as string[],
  category_id: "", category_ids: [] as string[], water_resistance: "", size_info: "", is_active: true,
  variants: [] as Variant[],
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [fullEditProduct, setFullEditProduct] = useState<Product | null>(null);
  const [fullEditForm, setFullEditForm] = useState({ ...emptyForm });
  const [fullEditSaving, setFullEditSaving] = useState(false);
  const [fullEditError, setFullEditError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${API_BASE}/products`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) return;
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(); fetchCategories(); }, [fetchProducts, fetchCategories]);

  const UPLOAD_URL = `${process.env.NEXT_PUBLIC_API_URL || "https://api.salmabehery.com"}/api/upload/multiple`;

  const uploadImagesForAdd = async (files: File[]) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("images", f));
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const data = await res.json();
      if (data.urls) {
        setAddForm(p => {
          const next = [...(p.images || []), ...data.urls];
          return { ...p, images: next, main_image: next[0] || "" };
        });
      }
    } catch (e: any) { alert("Upload failed: " + e.message); }
    finally { setUploadingImage(false); }
  };

  const uploadImagesForEdit = async (files: File[]) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("images", f));
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const data = await res.json();
      if (data.urls) {
        setFullEditForm(p => {
          const next = [...(p.images || []), ...data.urls];
          return { ...p, images: next, main_image: next[0] || "" };
        });
      }
    } catch (e: any) { alert("Upload failed: " + e.message); }
    finally { setUploadingImage(false); }
  };

  // ✅ FIXED: handlers defined OUTSIDE render, stable references = no re-render focus loss
  const handleAddChange = useCallback((f: string, v: any) => setAddForm(p => ({ ...p, [f]: v })), []);
  const handleFullEditChange = useCallback((f: string, v: any) => setFullEditForm(p => ({ ...p, [f]: v })), []);

  const saveAddProduct = async () => {
    if (!addForm.name_en.trim()) { setAddError("Name required"); return; }
    if (!addForm.price || Number(addForm.price) <= 0) { setAddError("Valid price required"); return; }
    setAddSaving(true); setAddError("");
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: addForm.name_en.trim(), name_ar: addForm.name_ar || undefined,
          description_en: addForm.description_en || undefined, description_ar: addForm.description_ar || undefined,
          price: Number(addForm.price), old_price: addForm.old_price ? Number(addForm.old_price) : undefined,
          stock: Number(addForm.stock) || 0, material: addForm.material || undefined,
          main_image: addForm.images?.[0] || addForm.main_image || undefined,
          images: addForm.images?.length > 0 ? addForm.images : (addForm.main_image ? [addForm.main_image] : []),
          category_id: addForm.category_ids[0] || addForm.category_id || undefined,
          category_ids: addForm.category_ids.length > 0 ? addForm.category_ids : undefined,
          water_resistance: addForm.water_resistance || undefined,
          size_info: addForm.size_info || undefined, is_active: addForm.is_active,
          variants: addForm.variants || [],
        }),
      });
      if (res.ok) {
        const r = await res.json();
        setProducts(p => [r.product || r, ...p]);
        setShowAddModal(false);
        alert("✅ Product added!");
      } else {
        const e = await res.json().catch(() => ({}));
        setAddError(e.details || e.error || "Failed");
      }
    } catch (e: any) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  const saveFullEdit = async () => {
    if (!fullEditProduct || !fullEditForm.name_en.trim()) { setFullEditError("Name required"); return; }
    setFullEditSaving(true); setFullEditError("");
    try {
      const res = await fetch(`${API_BASE}/products/${fullEditProduct.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: fullEditForm.name_en.trim(), name_ar: fullEditForm.name_ar || undefined,
          description_en: fullEditForm.description_en || undefined, description_ar: fullEditForm.description_ar || undefined,
          price: Number(fullEditForm.price), old_price: fullEditForm.old_price ? Number(fullEditForm.old_price) : null,
          stock: Number(fullEditForm.stock) || 0, material: fullEditForm.material || undefined,
          main_image: fullEditForm.images?.[0] || fullEditForm.main_image || undefined,
          images: fullEditForm.images?.length > 0 ? fullEditForm.images : (fullEditForm.main_image ? [fullEditForm.main_image] : undefined),
          category_id: fullEditForm.category_ids[0] || fullEditForm.category_id || undefined,
          category_ids: fullEditForm.category_ids.length > 0 ? fullEditForm.category_ids : undefined,
          water_resistance: fullEditForm.water_resistance || undefined,
          size_info: fullEditForm.size_info || undefined, is_active: fullEditForm.is_active,
          variants: fullEditForm.variants || [],
        }),
      });
      if (res.ok) {
        const r = await res.json();
        setProducts(p => p.map(x => x.id === fullEditProduct.id ? { ...x, ...(r.product || r) } : x));
        setFullEditProduct(null);
        alert("✅ Updated!");
      } else {
        const e = await res.json().catch(() => ({}));
        setFullEditError(e.details || e.error || "Failed");
      }
    } catch (e: any) { setFullEditError(e.message); }
    finally { setFullEditSaving(false); }
  };

  const saveQuickEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(editPrice), stock: Number(editStock) }),
      });
      if (res.ok) {
        setProducts(p => p.map(x => x.id === id ? { ...x, price: Number(editPrice), stock: Number(editStock) } : x));
        setEditingId(null);
      } else {
        const e = await res.json().catch(() => ({}));
        alert(e.details || e.error || "Failed");
      }
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (id: string, cur: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}/toggle`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cur }),
      });
      if (res.ok) setProducts(p => p.map(x => x.id === id ? { ...x, is_active: !cur } : x));
    } catch {}
  };

  const deleteProduct = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
      if (res.ok) setProducts(p => p.filter(x => x.id !== id));
    } catch {}
  };

  const openFullEdit = (p: Product) => {
    setFullEditProduct(p);
    const existingCatIds = p.category_ids || (p.categories?.map(c => c.id)) || (p.category_id ? [p.category_id] : []);
    setFullEditForm({
      name_en: p.name_en || "", name_ar: p.name_ar || "",
      description_en: p.description_en || "", description_ar: p.description_ar || "",
      price: String(p.price || 0), old_price: p.old_price ? String(p.old_price) : "",
      stock: String(p.stock || 0), material: p.material || "",
      main_image: p.main_image || p.image_url || "",
      images: p.images?.length ? p.images : (p.main_image || p.image_url) ? [p.main_image || p.image_url || ""] : [],
      category_id: p.category_id || "",
      category_ids: existingCatIds,
      water_resistance: p.water_resistance || "", size_info: p.size_info || "",
      is_active: p.is_active !== false,
      variants: Array.isArray(p.variants) ? p.variants : [],
    });
    setFullEditError("");
  };

  const filtered = products.filter(p => {
    if (!p) return false;
    if (!showInactive && !p.is_active) return false;
    const q = search.toLowerCase();
    return (p.name_en?.toLowerCase() || "").includes(q) || (p.name_ar?.toLowerCase() || "").includes(q);
  });

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #f4f3ff; }
        input, select, textarea { font-size: 16px !important; }
        .prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @media (max-width: 640px) {
          .prod-outer { padding: 10px !important; }
          .prod-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .prod-header-btns { width: 100% !important; }
          .prod-header-btns button { flex: 1 !important; }
          .prod-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .prod-modal-pad { padding: 10px !important; }
        }
      `}</style>
      <div className="prod-outer" style={{ minHeight: "100vh", padding: "14px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div className="prod-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <Link href="/admin" style={{ color: "#7c3aed", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Back to Dashboard</Link>
              <h1 style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "#1e1b4b" }}>Product Management</h1>
            </div>
            <div className="prod-header-btns" style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setAddForm({ ...emptyForm }); setAddError(""); setShowAddModal(true); }}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                ➕ Add Product
              </button>
              <button onClick={async () => {
                if (!confirm("Activate ALL draft products?")) return;
                await Promise.all(products.filter(p => !p.is_active).map(p =>
                  fetch(`${API_BASE}/products/${p.id}/toggle`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: true }) })
                ));
                fetchProducts();
              }}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#fda1b7", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                ⚡ Activate All
              </button>
              <button onClick={fetchProducts}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                🔄 Refresh
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", maxWidth: 400, padding: "12px 16px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#666" }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ width: 18, height: 18 }} />
              Show Draft
            </label>
            <span style={{ marginLeft: "auto", fontSize: 14, color: "#888" }}>{filtered.length}/{products.length} products</span>
          </div>

          {error && (
            <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 12, padding: 16, marginBottom: 24, color: "#ef4444", fontWeight: 600 }}>
              ⚠️ {error}
              <button onClick={fetchProducts} style={{ marginLeft: 12, padding: "6px 12px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="prod-grid">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #eee" }}>
                  <div style={{ aspectRatio: "3/4", background: "linear-gradient(90deg,#f5f5f5 25%,#ebebeb 50%,#f5f5f5 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.2s infinite" }} />
                  <div style={{ padding: 12 }}>
                    <div style={{ height: 13, background: "#f5f5f5", borderRadius: 6, marginBottom: 8, width: "75%" }} />
                    <div style={{ height: 12, background: "#f5f5f5", borderRadius: 6, width: "45%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="prod-grid">
                {filtered.map(p => {
                  const isEditing = editingId === p.id;
                  const stockGood = (p.stock || 0) > 10;
                  const stockLow = (p.stock || 0) > 0 && (p.stock || 0) <= 10;
                  return (
                    <div key={p.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #eee", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", opacity: p.is_active ? 1 : 0.6, display: "flex", flexDirection: "column" }}>
                      {/* Image */}
                      <div style={{ position: "relative", background: "#fdf0f3", aspectRatio: "3/4", overflow: "hidden" }}>
                        <img src={getProductImage(p)} alt={p.name_en}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/300x400/fda1b7/fff?text=?"; }} />
                        <span style={{ position: "absolute", top: 7, left: 7, padding: "3px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: p.is_active ? "#1a1a2e" : "#888", color: "#fff" }}>
                          {p.is_active ? "ACTIVE" : "DRAFT"}
                        </span>
                        <span style={{ position: "absolute", bottom: 7, left: 7, padding: "3px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: stockGood ? "#1a1a2e" : stockLow ? "#fda1b7" : "#ef4444", color: "#fff" }}>
                          {p.stock || 0} pcs
                        </span>
                        {p.categories && p.categories.length > 0 && (
                          <div style={{ position: "absolute", top: 7, right: 7, display: "flex", gap: 3, flexDirection: "column", alignItems: "flex-end" }}>
                            {p.categories.slice(0,2).map(c => (
                              <span key={c.id} style={{ fontSize: 8, color: "#fff", background: "#fda1b7", padding: "2px 6px", borderRadius: 20, fontWeight: 700 }}>{c.name_en}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ padding: "10px 10px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name_en}</div>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                            <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="Price" autoFocus
                              style={{ flex: 1, padding: "5px 6px", borderRadius: 7, border: "1.5px solid #fda1b7", fontSize: 11, outline: "none" }} />
                            <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} placeholder="Stock"
                              style={{ width: 52, padding: "5px 6px", borderRadius: 7, border: "1.5px solid #fda1b7", fontSize: 11, outline: "none" }} />
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>{p.price} EGP</span>
                            {p.old_price && p.old_price > 0 && <span style={{ fontSize: 10, color: "#bbb", textDecoration: "line-through" }}>{p.old_price}</span>}
                          </div>
                        )}
                        {/* Actions */}
                        <div style={{ display: "flex", gap: 4, marginTop: "auto", paddingTop: 6 }}>
                          {isEditing ? (
                            <>
                              <button onClick={() => saveQuickEdit(p.id)} disabled={saving}
                                style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                {saving ? "..." : "Save"}
                              </button>
                              <button onClick={() => setEditingId(null)}
                                style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #eee", background: "#fff", color: "#888", fontSize: 10, cursor: "pointer" }}>
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => toggleActive(p.id, p.is_active)}
                                style={{ padding: "6px 6px", borderRadius: 7, border: "1.5px solid #eee", background: "#fff", color: "#555", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
                                {p.is_active ? "Hide" : "Show"}
                              </button>
                              <button onClick={() => { setEditingId(p.id); setEditPrice(String(p.price)); setEditStock(String(p.stock)); }}
                                style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: "#fda1b7", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                                Quick
                              </button>
                              <button onClick={() => openFullEdit(p)}
                                style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: "#1a1a2e", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                                Edit
                              </button>
                              <button onClick={() => deleteProduct(p.id)}
                                style={{ padding: "6px 8px", borderRadius: 7, border: "none", background: "#fee2e2", color: "#ef4444", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
                  {search ? "No results found" : "No products yet"}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "auto", padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>➕ Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {addError && <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 10, padding: 12, marginBottom: 20, color: "#ef4444", fontWeight: 600 }}>⚠️ {addError}</div>}
            <ProductFormFields form={addForm} onChange={handleAddChange} formId="add" categories={categories} uploadingImage={uploadingImage} onUploadImages={uploadImagesForAdd} />
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#666", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveAddProduct} disabled={addSaving} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", fontWeight: 700, cursor: addSaving ? "not-allowed" : "pointer", opacity: addSaving ? 0.7 : 1 }}>
                {addSaving ? "💾 Adding..." : "💾 Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {fullEditProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 }} onClick={() => setFullEditProduct(null)}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "auto", padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>✏️ Edit: {fullEditProduct.name_en}</h2>
              <button onClick={() => setFullEditProduct(null)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {fullEditError && <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 10, padding: 12, marginBottom: 20, color: "#ef4444", fontWeight: 600 }}>⚠️ {fullEditError}</div>}
            <ProductFormFields form={fullEditForm} onChange={handleFullEditChange} formId="edit" categories={categories} uploadingImage={uploadingImage} onUploadImages={uploadImagesForEdit} />
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setFullEditProduct(null)} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#666", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveFullEdit} disabled={fullEditSaving} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fda1b7,#f78fa3)", color: "#fff", fontWeight: 700, cursor: fullEditSaving ? "not-allowed" : "pointer", opacity: fullEditSaving ? 0.7 : 1 }}>
                {fullEditSaving ? "💾 Saving..." : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
