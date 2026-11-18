'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Design, Order, OrderStatus, Product, StoreSettings } from '@/lib/types';
import { INITIAL_DESIGNS, INITIAL_PRODUCTS, INITIAL_SETTINGS, newId } from '@/lib/mock-data';
import { useToast } from './ToastContext';

interface StoreContextType {
  products: Product[];
  designs: Design[];
  settings: StoreSettings;
  orders: Order[];
  isLoading: boolean;
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveDesign: (design: Design) => Promise<void>;
  deleteDesign: (id: string) => Promise<void>;
  saveSettings: (settings: StoreSettings) => Promise<void>;
  placeOrder: (orderData: Omit<Order, 'id' | 'code' | 'createdAt' | 'status'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [designs, setDesigns] = useState<Design[]>(INITIAL_DESIGNS);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // 1. Load from localStorage cache first for instantaneous UI
    try {
      const savedProds = localStorage.getItem('tl_products');
      const savedDesigns = localStorage.getItem('tl_designs');
      const savedSettings = localStorage.getItem('tl_settings');
      const savedOrders = localStorage.getItem('tl_orders');

      if (savedProds) setProducts(JSON.parse(savedProds));
      if (savedDesigns) setDesigns(JSON.parse(savedDesigns));
      if (savedSettings) setSettings(JSON.parse(savedSettings));
      if (savedOrders) setOrders(JSON.parse(savedOrders));
    } catch {
      // Ignore
    }

    // 2. Fetch from backend API routes
    Promise.all([
      fetch('/api/products')
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/designs')
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/settings')
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/orders')
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([prodRes, desRes, setRes, ordRes]) => {
        if (prodRes?.products?.length) {
          setProducts(prodRes.products);
          localStorage.setItem('tl_products', JSON.stringify(prodRes.products));
        }
        if (desRes?.designs?.length) {
          setDesigns(desRes.designs);
          localStorage.setItem('tl_designs', JSON.stringify(desRes.designs));
        }
        if (setRes?.settings) {
          setSettings(setRes.settings);
          localStorage.setItem('tl_settings', JSON.stringify(setRes.settings));
        }
        if (ordRes?.orders?.length) {
          setOrders(ordRes.orders);
          localStorage.setItem('tl_orders', JSON.stringify(ordRes.orders));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const saveProduct = async (p: Product) => {
    const isNew = !products.some((x) => x.id === p.id);
    const updated = isNew ? [...products, p] : products.map((x) => (x.id === p.id ? p : x));
    setProducts(updated);
    localStorage.setItem('tl_products', JSON.stringify(updated));

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (data?.product) {
        setProducts((prev) => {
          const synced = prev.map((x) => (x.id === data.product.id ? data.product : x));
          localStorage.setItem('tl_products', JSON.stringify(synced));
          return synced;
        });
      }
    } catch {
      // Offline fallback
    }
    toast(isNew ? 'Product added' : 'Product updated');
  };

  const deleteProduct = async (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    localStorage.setItem('tl_products', JSON.stringify(updated));

    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
    } catch {
      // Offline fallback
    }
    toast('Product deleted');
  };

  const saveDesign = async (d: Design) => {
    const isNew = !designs.some((x) => x.id === d.id);
    const updated = isNew ? [d, ...designs] : designs.map((x) => (x.id === d.id ? d : x));
    setDesigns(updated);
    localStorage.setItem('tl_designs', JSON.stringify(updated));

    try {
      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      });
      const data = await res.json();
      if (data?.design) {
        setDesigns((prev) => {
          const synced = prev.map((x) => (x.id === data.design.id ? data.design : x));
          if (!synced.some((x) => x.id === data.design.id)) {
            synced.unshift(data.design);
          }
          localStorage.setItem('tl_designs', JSON.stringify(synced));
          return synced;
        });
      }
    } catch {
      // Offline fallback
    }
    toast(isNew ? 'Design added' : 'Design updated');
  };

  const deleteDesign = async (id: string) => {
    const updated = designs.filter((d) => d.id !== id);
    setDesigns(updated);
    localStorage.setItem('tl_designs', JSON.stringify(updated));

    try {
      await fetch(`/api/designs/${id}`, { method: 'DELETE' });
    } catch {
      // Offline fallback
    }
    toast('Design removed');
  };

  const saveSettings = async (s: StoreSettings) => {
    setSettings(s);
    localStorage.setItem('tl_settings', JSON.stringify(s));

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
    } catch {
      // Offline fallback
    }
    toast('Store settings saved');
  };

  const placeOrder = async (
    orderData: Omit<Order, 'id' | 'code' | 'createdAt' | 'status'>
  ): Promise<Order> => {
    let createdOrder: Order;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        const json = await res.json();
        createdOrder = json.order;
      } else {
        throw new Error('API order placement failed');
      }
    } catch {
      // Local fallback
      const id = newId();
      const code = id.slice(-6).toUpperCase();
      createdOrder = {
        ...orderData,
        id,
        code,
        status: 'new',
        createdAt: Date.now(),
      };
    }

    const updated = [createdOrder, ...orders];
    setOrders(updated);
    localStorage.setItem('tl_orders', JSON.stringify(updated));
    return createdOrder;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    setOrders(updated);
    localStorage.setItem('tl_orders', JSON.stringify(updated));

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {
      // Offline fallback
    }
    toast('Order status updated');
  };

  const cancelOrder = async (orderId: string) => {
    const updated = orders.map((o) =>
      o.id === orderId
        ? { ...o, status: 'cancelled' as OrderStatus, cancelledBy: 'customer' as const }
        : o
    );
    setOrders(updated);
    localStorage.setItem('tl_orders', JSON.stringify(updated));

    try {
      await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
    } catch {
      // Offline fallback
    }
    toast('Order cancelled');
  };

  const deleteOrder = async (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem('tl_orders', JSON.stringify(updated));

    try {
      await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    } catch {
      // Offline fallback
    }
    toast('Order deleted');
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        designs,
        settings,
        orders,
        isLoading,
        saveProduct,
        deleteProduct,
        saveDesign,
        deleteDesign,
        saveSettings,
        placeOrder,
        updateOrderStatus,
        cancelOrder,
        deleteOrder,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
