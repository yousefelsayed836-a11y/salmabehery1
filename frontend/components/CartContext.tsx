"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface CartItem {
  product: { id: string; name_en: string; price: number; image_url?: string };
  qty: number; size: string;
}
interface CartCtx {
  cartItems: CartItem[]; cartCount: number; cartTotal: number;
  addToCart: (p: CartItem["product"], qty: number, size: string, stock?: number) => boolean;
  removeFromCart: (id: string, size: string) => void;
  updateQty: (id: string, size: string, delta: number) => void;
  clearCart: () => void;
}
const CartContext = createContext<CartCtx | null>(null);
const KEY = "cart";

function readCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Initial load
  useEffect(() => { setCartItems(readCart()); }, []);

  // Listen for cart changes from other tabs OR from checkout page
  useEffect(() => {
    const sync = () => setCartItems(readCart());
    window.addEventListener("cartUpdated", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("cartUpdated", sync); window.removeEventListener("storage", sync); };
  }, []);

  // Save to localStorage on change (but don't re-trigger sync)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(cartItems)); } catch {}
  }, [cartItems]);

  const addToCart = useCallback((product: CartItem["product"], qty: number, size: string, stock?: number): boolean => {
    if (stock !== undefined && stock === 0) return false;
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id && i.size === size);
      if (idx >= 0) { const u = [...prev]; u[idx] = { ...u[idx], qty: Math.min(10, u[idx].qty + qty) }; return u; }
      return [...prev, { product, qty: Math.min(10, qty), size }];
    });
    return true;
  }, []);

  const removeFromCart = useCallback((id: string, size: string) => setCartItems(prev => prev.filter(i => !(i.product.id === id && i.size === size))), []);
  const updateQty = useCallback((id: string, size: string, delta: number) => setCartItems(prev => prev.map(i => i.product.id === id && i.size === size ? { ...i, qty: Math.min(10, i.qty + delta) } : i).filter(i => i.qty > 0)), []);
  const clearCart = useCallback(() => setCartItems([]), []);

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);

  return <CartContext.Provider value={{ cartItems, cartCount, cartTotal, addToCart, removeFromCart, updateQty, clearCart }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

