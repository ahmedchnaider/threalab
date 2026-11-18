'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { AdminLock } from '@/components/admin/AdminLock';
import { ProductsManager } from '@/components/admin/ProductsManager';
import { OrdersManager } from '@/components/admin/OrdersManager';
import { CustomersManager } from '@/components/admin/CustomersManager';
import { DesignsManager } from '@/components/admin/DesignsManager';
import { SettingsManager } from '@/components/admin/SettingsManager';
import { Order } from '@/lib/types';
import { Lock } from 'lucide-react';

type AdminTab = 'products' | 'orders' | 'customers' | 'designs' | 'store';

function normalizePhone(p?: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('216') && digits.length === 11) {
    return digits.slice(3);
  }
  return digits;
}

export default function AdminPage() {
  const { adminUnlocked, lockAdmin, user, profile, logout } = useAuth();
  const {
    products,
    designs,
    orders,
    settings,
    saveProduct,
    deleteProduct,
    saveDesign,
    deleteDesign,
    saveSettings,
    updateOrderStatus,
    deleteOrder,
    deleteOrders,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  if (!adminUnlocked) {
    return <AdminLock />;
  }

  const handleDeleteCustomerAccount = async (customer: {
    userId?: string;
    email?: string;
    phone?: string;
    orders?: Order[];
  }) => {
    const cleanEmail = (customer.email || '').trim().toLowerCase();
    const cleanPhone = (customer.phone || '').trim();
    const cleanNormPhone = normalizePhone(cleanPhone);
    const validEmail = cleanEmail && cleanEmail !== 'no email' ? cleanEmail : undefined;
    const validPhone = cleanPhone && cleanPhone !== 'no phone' ? cleanPhone : undefined;

    // 1. Gather all order IDs associated with this customer
    const matchedOrderIds = new Set<string>();
    (customer.orders || []).forEach((o) => matchedOrderIds.add(o.id));
    orders.forEach((o) => {
      const oEmail = (o.customer?.email || '').trim().toLowerCase();
      const oNormPhone = normalizePhone(o.customer?.phone);
      if (customer.userId && o.uid && o.uid === customer.userId) {
        matchedOrderIds.add(o.id);
      }
      if (cleanEmail && cleanEmail !== 'no email' && oEmail === cleanEmail) {
        matchedOrderIds.add(o.id);
      }
      if (cleanNormPhone && oNormPhone === cleanNormPhone) {
        matchedOrderIds.add(o.id);
      }
    });
    const idsToDelete = Array.from(matchedOrderIds);

    // 2. Immediately delete customer's orders from local store state & localStorage cache
    await deleteOrders(idsToDelete, {
      email: validEmail,
      phone: validPhone,
      userId: customer.userId,
    });

    // Explicitly update localStorage tl_orders in this window
    try {
      const rawOrders = localStorage.getItem('tl_orders');
      if (rawOrders) {
        const parsed = JSON.parse(rawOrders);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((o: any) => {
            if (idsToDelete.includes(o.id)) return false;
            if (customer.userId && o.uid && o.uid === customer.userId) return false;
            const oEmail = (o.customer?.email || '').trim().toLowerCase();
            const oPhone = normalizePhone(o.customer?.phone);
            if (validEmail && oEmail === validEmail) return false;
            if (cleanNormPhone && oPhone === cleanNormPhone) return false;
            return true;
          });
          localStorage.setItem('tl_orders', JSON.stringify(filtered));
        }
      }
    } catch {}

    // 3. Delete customer account, auth user, and orders from backend
    try {
      const q = new URLSearchParams();
      if (cleanEmail && cleanEmail !== 'no email') q.set('email', cleanEmail);
      if (cleanPhone && cleanPhone !== 'no phone') q.set('phone', cleanPhone);
      if (customer.userId) q.set('userId', customer.userId);
      if (idsToDelete.length > 0) q.set('orderIds', idsToDelete.join(','));

      await fetch(`/api/profile?${q.toString()}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete customer account:', err);
    }

    // 4. Broadcast deletion across all tabs/windows (logs customer out without affecting admin)
    try {
      const payload = {
        email: validEmail,
        phone: validPhone,
        userId: customer.userId,
        orderIds: idsToDelete.length > 0 ? idsToDelete : undefined,
        time: Date.now(),
      };

      localStorage.setItem('tl_deleted_account', JSON.stringify(payload));
      if (validEmail) {
        localStorage.removeItem(`tl_profile_${validEmail}`);
      }

      // If active customer in this browser session matches the deleted customer, reset customer auth
      const activeEmail = (user?.email || profile?.email || '').trim().toLowerCase();
      const activeNormPhone = normalizePhone(profile?.phone);
      let matchesSession = Boolean(
        (validEmail && activeEmail === validEmail) ||
        (cleanNormPhone && activeNormPhone && cleanNormPhone === activeNormPhone)
      );

      // Check localStorage cached customer profile as well
      try {
        const savedUserStr = localStorage.getItem('tl_user');
        const savedProfileStr = localStorage.getItem('tl_profile');
        if (savedUserStr) {
          const u = JSON.parse(savedUserStr);
          if (validEmail && u.email && u.email.toLowerCase() === validEmail) matchesSession = true;
          if (customer.userId && u.id && u.id === customer.userId) matchesSession = true;
        }
        if (savedProfileStr) {
          const p = JSON.parse(savedProfileStr);
          if (validEmail && p.email && p.email.toLowerCase() === validEmail) matchesSession = true;
          if (cleanNormPhone && normalizePhone(p.phone) === cleanNormPhone) matchesSession = true;
        }
      } catch {}

      if (matchesSession) {
        try {
          localStorage.removeItem('tl_user');
          localStorage.removeItem('tl_profile');
          localStorage.removeItem('tl_checkout_info');
        } catch {}
        await logout('Customer account and orders were deleted.');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tl_deleted_account', { detail: payload }));
      }
    } catch {}
  };

  const handleClearAllData = async () => {
    // 1. Delete all orders from local state & storage
    const allOrderIds = orders.map((o) => o.id);
    if (allOrderIds.length > 0) {
      await deleteOrders(allOrderIds);
    }

    // 2. Wipe Supabase orders, order items, storage, profiles, auth users
    try {
      await fetch('/api/profile?all=true', { method: 'DELETE' });
    } catch {}

    // 3. Clear customer cache in localStorage
    try {
      localStorage.removeItem('tl_orders');
      localStorage.removeItem('tl_user');
      localStorage.removeItem('tl_profile');
      localStorage.removeItem('tl_checkout_info');

      // Clear all email-keyed profile caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tl_profile_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Broadcast to all tabs to clear customer session and orders
      const payload = { clearAll: true, time: Date.now() };
      localStorage.setItem('tl_deleted_account', JSON.stringify(payload));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tl_deleted_account', { detail: payload }));
      }
    } catch {}

    // 4. Log out any active customer session on this window while keeping admin unlocked
    await logout('All customer and order data has been cleared.');
  };

  const tabs: Array<{ id: AdminTab; label: string; count?: number }> = [
    { id: 'products', label: 'Products', count: products.length },
    { id: 'orders', label: 'Orders', count: orders.length },
    { id: 'customers', label: 'Customers' },
    { id: 'designs', label: 'Designs Library', count: designs.length },
    { id: 'store', label: 'Store Settings' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Admin Header */}
      <div className="flex justify-between items-center pb-4 border-b-[1.5px] border-[#141414]">
        <div className="flex items-center gap-3">
          <h1 className="font-anton text-3xl sm:text-4xl uppercase tracking-wide text-[#141414]">
            Store Administration
          </h1>
          <span className="hidden sm:inline bg-[#ff4d1c] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Unlocked
          </span>
        </div>

        <button
          onClick={lockAdmin}
          className="px-3.5 py-1.5 rounded-full border border-[#141414] hover:bg-[#141414] hover:text-[#f4f1ea] text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-[#ff4d1c]" />
          <span>Lock Panel</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#ddd6c8] pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border transition-all shrink-0 ${
                isActive
                  ? 'bg-[#141414] text-[#f4f1ea] border-[#141414]'
                  : 'bg-transparent text-[#141414] border-transparent hover:border-[#141414]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-[#ff4d1c] text-white' : 'bg-[#ebe6dc] text-[#141414]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'products' && (
          <ProductsManager
            products={products}
            currency={settings.currency}
            onSave={saveProduct}
            onDelete={deleteProduct}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersManager
            orders={orders}
            currency={settings.currency}
            onUpdateStatus={updateOrderStatus}
            onDeleteOrder={deleteOrder}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersManager
            orders={orders}
            currency={settings.currency}
            onDeleteCustomer={handleDeleteCustomerAccount}
            onClearAllData={handleClearAllData}
          />
        )}

        {activeTab === 'designs' && (
          <DesignsManager
            designs={designs}
            onSave={saveDesign}
            onDelete={deleteDesign}
          />
        )}

        {activeTab === 'store' && (
          <SettingsManager settings={settings} onSave={saveSettings} />
        )}
      </div>
    </div>
  );
}
