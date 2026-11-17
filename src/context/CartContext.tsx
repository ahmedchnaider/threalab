'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '@/lib/types';
import { useToast } from './ToastContext';

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (item: CartItem) => void;
  updateQty: (key: string, delta: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tl_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch {
      // LocalStorage error fallback
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem('tl_cart', JSON.stringify(newCart));
    } catch {
      // Ignore write errors
    }
  };

  const addToCart = (item: CartItem) => {
    const updated = [...cart, item];
    saveCart(updated);
    toast('Added to cart ✓');
  };

  const updateQty = (key: string, delta: number) => {
    const updated = cart.map((item) => {
      if (item.key === key) {
        const newQty = Math.max(1, Math.min(99, item.qty + delta));
        return { ...item, qty: newQty };
      }
      return item;
    });
    saveCart(updated);
  };

  const removeFromCart = (key: string) => {
    const updated = cart.filter((item) => item.key !== key);
    saveCart(updated);
    toast('Item removed from cart');
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.unit * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount: isLoaded ? cartCount : 0,
        cartTotal,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
