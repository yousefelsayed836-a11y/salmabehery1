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
const KEY = "sb_cart_v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try { setCartItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cartItems));
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {}
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
  const updateQty = useCallback((id: string, size: string, delta: number) => setCartItems(prev => prev.map(i => i.product.id === id && i.size === size ? { ...i, qty: Math.min(10, Math.max(1, i.qty + delta)) } : i)), []);
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
