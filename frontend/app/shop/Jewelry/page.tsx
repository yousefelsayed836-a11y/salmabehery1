"use client"

import { useState, useEffect } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name_en: string;
  name_ar?: string;
  description_en?: string;
  price: number;
  old_price?: number;
  material?: string;
  water_resistance?: string;
  size_info?: string;
  images?: string[];
  main_image?: string;
  category_name?: string;
  category_slug?: string;
  is_active: boolean;
}

interface CartItem {
  product: {
    id: string;
    name_en: string;
    price: number;
    image_url?: string;
  };
  qty: number;
  size: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://salma-backend-4imp.onrender.com") + "/api";



function getProductImage(product: Product): string {
  if (product.main_image && product.main_image.startsWith("http")) {
    return product.main_image;
  }
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const firstValid = product.images.find((img: string) => img && img.startsWith("http"));
    if (firstValid) return firstValid;
  }
  return `https://placehold.co/400x400/fda1b7/fff?text=${encodeURIComponent(product.name_en?.slice(0, 10) || "??")}`;
}

export default function BraceletPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
    const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 🛒 Cart State — نفس شكل Cart Page
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Quantity selector for each product in grid
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [sizes, setSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Load cart from localStorage — نفس الـ key اللي Cart Page بيستخدمه
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (e) {
        console.log("Cart parse error", e);
      }
    }
  }, []);

  useEffect(() => {
    // Save cart to localStorage — نفس الـ key
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const url = `${API_BASE}/products?is_active=true&collection=bracelet&limit=100`;
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const setProductQuantity = (productId: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [productId]: Math.min(10, Math.max(1, qty)) }));
  };

  const addToCart = (product: Product, qty: number = 1) => {
    const quantity = Math.min(10, Math.max(1, qty));
    const size = sizes[product.id] || product.size_info || "One Size";
    const imageUrl = getProductImage(product);

    setCartItems(prev => {
      // Check if same product + same size exists
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.size === size
      );

      if (existingIndex >= 0) {
        // Update existing
        const newCart = [...prev];
        const newQty = Math.min(10, newCart[existingIndex].qty + quantity);
        newCart[existingIndex] = { ...newCart[existingIndex], qty: newQty };
        return newCart;
      }

      // Add new
      return [...prev, {
        product: {
          id: product.id,
          name_en: product.name_en,
          price: product.price,
          image_url: imageUrl,
        },
        qty: quantity,
        size: size,
      }];
    });

    // Show mini cart or alert
    setShowCart(true);
  };

  const removeFromCart = (id: string, size: string) => {
    setCartItems(prev => prev.filter(item => !(item.product.id === id && item.size === size)));
  };

  const updateCartQty = (id: string, size: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.product.id === id && item.size === size) {
        const newQty = Math.min(10, Math.max(1, item.qty + delta));
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  const filteredProducts = products
    .sort((a, b) => {
      if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
      if (sortBy === "name") return (a.name_en || "").localeCompare(b.name_en || "");
      return 0;
    });

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter', sans-serif" }}>

      {/* 🛒 Floating Cart Button */}
      <button
        onClick={() => setShowCart(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fda1b7, #f78fa3)",
          color: "#fff",
          border: "none",
          fontSize: 24,
          cursor: "pointer",
          zIndex: 100,
          boxShadow: "0 4px 16px rgba(253,161,183,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🛒
        {cartCount > 0 && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "#ef4444",
            color: "#fff",
            borderRadius: "50%",
            width: 22,
            height: 22,
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {cartCount}
          </span>
        )}
      </button>

      {/* 🛒 Cart Sidebar */}
      {showCart && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => setShowCart(false)}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 380,
              maxWidth: "90%",
              height: "100%",
              background: "#fff",
              padding: 24,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🛒 Your Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", color: "#999" }}
              >
                ×
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {cartItems.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #eee" }}>
                      <img
                        src={item.product.image_url || ''}
                        alt={item.product.name_en}
                        style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product.name_en}</div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Size: {item.size}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <button
                            onClick={() => updateCartQty(item.product.id, item.size, -1)}
                            style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                          >-</button>
                          <span>{item.qty}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, item.size, 1)}
                            style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                          >+</button>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.size)}
                            style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#fda1b7" }}>
                        {item.product.price * item.qty} EGP
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "2px solid #eee", paddingTop: 16, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 700 }}>{cartTotal} EGP</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 12, color: "#888" }}>
                    <span>Shipping:</span>
                    <span>{cartTotal >= 900 ? "FREE" : "50 EGP"}</span>
                  </div>
                  <a
                    href="/cart"
                    style={{
                      display: "block",
                      width: "100%",
                      padding: 16,
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(135deg, #fda1b7, #f78fa3)",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      textDecoration: "none",
                    }}
                  >
                    View Full Cart →
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#fff",
        padding: "12px 24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        borderBottom: "1px solid #eee"
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#888" }}>
            <Link href="/" style={{ color: "#fda1b7", textDecoration: "none" }}>Home</Link>
            <span style={{ margin: "0 8px" }}>/</span>
            <Link href="/shop" style={{ color: "#fda1b7", textDecoration: "none" }}>Shop</Link>
            <span style={{ margin: "0 8px" }}>/</span>
            <span style={{ color: "#1a1a2e", fontWeight: 600 }}>Bracelet</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 25, border: "1px solid #ddd", fontSize: 14, cursor: "pointer", background: "#fff" }}
          >
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px", display: "flex", gap: 24 }}>
              <main style={{ flex: 1 }}>
          {error && (
            <div style={{ background: "#ef444418", border: "1px solid #ef4444", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "center" }}>
              <span style={{ color: "#ef4444", fontWeight: 600 }}>{error}</span>
              <button onClick={fetchProducts} style={{ marginLeft: 12, padding: "6px 12px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="product-grid">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ height: 280, background: "#fff", animation: "pulse 1.5s infinite" }} />
                  <div style={{ padding: 16 }}>
                    <div style={{ height: 20, background: "#fff", borderRadius: 4, marginBottom: 8, width: "70%", animation: "pulse 1.5s infinite" }} />
                    <div style={{ height: 16, background: "#fff", borderRadius: 4, width: "40%", animation: "pulse 1.5s infinite" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>
                  Bracelet Products
                </h2>
                <span style={{ fontSize: 14, color: "#888" }}>{filteredProducts.length} products</span>
              </div>

              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                  <p style={{ fontSize: 16, fontWeight: 600 }}>No products found</p>
                  <p style={{ fontSize: 14 }}>Try a different category</p>
                </div>
              ) : (
                <div className="product-grid">
                  {filteredProducts.map((product) => {
                    const imageUrl = getProductImage(product);
                    const hasDiscount = product.old_price && product.old_price > product.price;
                    const discountPercent = hasDiscount && product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0;
                    const qty = quantities[product.id] || 1;

                    return (
                      <div
                        key={product.id}
                        className="product-card"
                      >
                        {/* Image - clickable to open modal */}
                        <div 
                          className="product-image-wrapper"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <img
                            src={imageUrl}
                            alt={product.name_en}
                            className="product-image"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/400x400/fda1b7/fff?text=${encodeURIComponent(product.name_en?.slice(0, 10) || "??")}`;
                            }}
                          />

                          {hasDiscount && (
                            <div className="discount-badge">
                              -{discountPercent}%
                            </div>
                          )}

                          {product.water_resistance && (
                            <div className="water-badge">
                              💧 Resistant
                            </div>
                          )}

                          <div className="category-overlay">
                            <span>
                              {product.category_name || product.category_slug}
                            </span>
                          </div>
                        </div>

                        <div className="product-info">
                          <h3 
                            className="product-title"
                            onClick={() => setSelectedProduct(product)}
                          >
                            {product.name_en}
                          </h3>

                          {product.name_ar && (
                            <p className="product-title-ar">
                              {product.name_ar}
                            </p>
                          )}

                          <div className="price-row">
                            <span className="current-price">
                              {product.price} EGP
                            </span>
                            {hasDiscount && (
                              <span className="old-price">
                                {product.old_price} EGP
                              </span>
                            )}
                          </div>

                          {/* Quantity Selector + Add to Cart */}
                          <div className="cart-row">
                            <div className="qty-selector">
                              <button
                                onClick={() => setProductQuantity(product.id, Math.max(1, qty - 1))}
                                className="qty-btn"
                              >-</button>
                              <select
                                value={qty}
                                onChange={(e) => setProductQuantity(product.id, parseInt(e.target.value))}
                                className="qty-select"
                              >
                                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => setProductQuantity(product.id, Math.min(10, qty + 1))}
                                className="qty-btn"
                              >+</button>
                            </div>

                            <button
                              onClick={() => addToCart(product, qty)}
                              className="add-cart-btn"
                            >
                              🛒 Add
                            </button>
                          </div>

                          <div className="tags-row">
                            {product.material && (
                              <span className="tag tag-material">
                                {product.material}
                              </span>
                            )}
                            {product.size_info && (
                              <span className="tag tag-size">
                                📏 {product.size_info}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            padding: 20,
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Section */}
            <div style={{ position: "relative", background: "#fff", minHeight: 400 }}>
              <img
                src={getProductImage(selectedProduct)}
                alt={selectedProduct.name_en}
                style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 400 }}
              />

              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, display: "flex", gap: 8, overflowX: "auto" }}>
                  {selectedProduct.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${selectedProduct.name_en} ${idx + 1}`}
                      style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", border: "2px solid #fff", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const mainImg = e.currentTarget.parentElement?.previousElementSibling as HTMLImageElement;
                        if (mainImg) mainImg.src = img;
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Details Section */}
            <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: 12, color: "#fda1b7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                    {selectedProduct.category_name}
                  </span>
                  <h2 style={{ margin: "8px 0", fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>
                    {selectedProduct.name_en}
                  </h2>
                  {selectedProduct.name_ar && (
                    <p style={{ margin: 0, fontSize: 16, color: "#888", direction: "rtl" }}>
                      {selectedProduct.name_ar}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", color: "#999" }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#fda1b7" }}>
                  {selectedProduct.price} EGP
                </span>
                {selectedProduct.old_price && selectedProduct.old_price > selectedProduct.price && (
                  <span style={{ fontSize: 18, color: "#999", textDecoration: "line-through" }}>
                    {selectedProduct.old_price} EGP
                  </span>
                )}
              </div>

              {selectedProduct.description_en && (
                <div
                  style={{ fontSize: 14, lineHeight: 1.7, color: "#555" }}
                  dangerouslySetInnerHTML={{ __html: selectedProduct.description_en }}
                />
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedProduct.material && (
                  <span style={{ padding: "8px 14px", borderRadius: 12, fontSize: 13, background: "#fda1b718", color: "#fda1b7", fontWeight: 700 }}>
                    ✨ {selectedProduct.material}
                  </span>
                )}
                {selectedProduct.water_resistance && (
                  <span style={{ padding: "8px 14px", borderRadius: 12, fontSize: 13, background: "#dbeafe", color: "#1e40af", fontWeight: 700 }}>
                    💧 {selectedProduct.water_resistance}
                  </span>
                )}
                {selectedProduct.size_info && (
                  <span style={{ padding: "8px 14px", borderRadius: 12, fontSize: 13, background: "#fff", color: "#666", fontWeight: 700 }}>
                    📏 Size: {selectedProduct.size_info}
                  </span>
                )}
              </div>

              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                <button
                  onClick={() => addToCart(selectedProduct, quantities[selectedProduct.id] || 1)}
                  style={{
                    width: "100%",
                    padding: 16,
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #fda1b7, #f78fa3)",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                >
                  🛒 Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* ====== GRID: 2 per row ====== */
        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 640px) {
          .product-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (min-width: 768px) {
          .product-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
        }

        @media (min-width: 1024px) {
          .product-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
          }
        }

        /* ====== Product Card ====== */
        .product-card {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        @media (hover: hover) {
          .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          }
          .product-card:hover .product-image {
            transform: scale(1.05);
          }
        }

        /* ====== Image ====== */
        .product-image-wrapper {
          position: relative;
          height: 220px;
          background: #f8f8f8;
          overflow: hidden;
          cursor: pointer;
        }
        @media (min-width: 640px) {
          .product-image-wrapper { height: 260px; }
        }
        @media (min-width: 768px) {
          .product-image-wrapper { height: 280px; }
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        /* ====== Badges ====== */
        .discount-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: #ef4444;
          color: #fff;
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }
        @media (min-width: 640px) {
          .discount-badge { top: 12px; left: 12px; padding: 4px 10px; font-size: 12px; }
        }

        .water-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #3b82f6;
          color: #fff;
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
        }
        @media (min-width: 640px) {
          .water-badge { top: 12px; right: 12px; padding: 4px 10px; font-size: 11px; }
        }

        .category-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px;
          background: linear-gradient(transparent, rgba(0,0,0,0.6));
          color: #fff;
        }
        .category-overlay span {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1;
        }
        @media (min-width: 640px) {
          .category-overlay { padding: 12px; }
          .category-overlay span { font-size: 12px; }
        }

        /* ====== Product Info ====== */
        .product-info {
          padding: 12px;
        }
        @media (min-width: 640px) {
          .product-info { padding: 16px; }
        }

        .product-title {
          margin: 0 0 6px;
          font-size: 13px;
          font-weight: 700;
          color: #1a1a2e;
          line-height: 1.3;
          cursor: pointer;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .product-title { font-size: 15px; margin-bottom: 8px; line-height: 1.4; }
        }

        .product-title-ar {
          margin: 0 0 6px;
          font-size: 12px;
          color: #888;
          direction: rtl;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .product-title-ar { font-size: 13px; margin-bottom: 8px; }
        }

        /* ====== Price ====== */
        .price-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        @media (min-width: 640px) {
          .price-row { gap: 10px; margin-bottom: 12px; }
        }

        .current-price {
          font-size: 16px;
          font-weight: 800;
          color: #fda1b7;
        }
        @media (min-width: 640px) {
          .current-price { font-size: 20px; }
        }

        .old-price {
          font-size: 12px;
          color: #999;
          text-decoration: line-through;
        }
        @media (min-width: 640px) {
          .old-price { font-size: 14px; }
        }

        /* ====== Cart Row ====== */
        .cart-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @media (min-width: 640px) {
          .cart-row { gap: 10px; }
        }

        .qty-selector {
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 8;
          overflow: hidden;
        }

        .qty-btn {
          width: 28px;
          height: 32px;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 640px) {
          .qty-btn { width: 32px; height: 36px; font-size: 16px; }
        }

        .qty-select {
          width: 40px;
          height: 32px;
          border: none;
          border-left: 1px solid #ddd;
          border-right: 1px solid #ddd;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          background: #fff;
        }
        @media (min-width: 640px) {
          .qty-select { width: 50px; height: 36px; font-size: 14px; }
        }

        .add-cart-btn {
          flex: 1;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #fda1b7, #f78fa3);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          display: flex;
          align-items: center;
            justify-content: center;
        }
        @media (hover: hover) {
          .add-cart-btn:hover { transform: scale(1.02); }
        }
        @media (min-width: 640px) {
          .add-cart-btn { height: 36px; font-size: 13px; }
        }

        /* ====== Tags ====== */
        .tags-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        @media (min-width: 640px) {
          .tags-row { gap: 6px; margin-top: 10px; }
        }

        .tag {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }
        @media (min-width: 640px) {
          .tag { padding: 4px 10px; font-size: 11px; }
        }

        .tag-material {
          background: #fda1b718;
          color: #fda1b7;
        }
        .tag-size {
          background: #f3f4f6;
          color: #666;
        }

        /* ====== Modal ====== */
        .modal-container {
          background: #fff;
          border-radius: 20px;
          width: 900;
          max-width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        @media (max-width: 768px) {
          .modal-container {
            grid-template-columns: 1fr;
            width: 100%;
            max-height: 95vh;
          }
        }

        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .mobile-categories { display: block !important; }
        }
        @media (min-width: 769px) {
          .sidebar { display: block !important; }
          .mobile-categories { display: none !important; }
        }
      `}</style>
    </div>
  );
}
