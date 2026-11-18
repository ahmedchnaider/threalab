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
    email?: string;
    phone?: string;
    orders?: Order[];
  }) => {
    const cleanEmail = (customer.email || '').trim().toLowerCase();
    const cleanPhone = (customer.phone || '').trim();

    // 1. Gather all order IDs associated with this customer
    const matchedOrderIds = new Set<string>();
    (customer.orders || []).forEach((o) => matchedOrderIds.add(o.id));
    orders.forEach((o) => {
      const oEmail = (o.customer.email || '').trim().toLowerCase();
      const oPhone = (o.customer.phone || '').trim();
      if (cleanEmail && cleanEmail !== 'no email' && oEmail === cleanEmail) {
        matchedOrderIds.add(o.id);
      }
      if (cleanPhone && cleanPhone !== 'no phone' && oPhone === cleanPhone) {
        matchedOrderIds.add(o.id);
      }
    });
    const idsToDelete = Array.from(matchedOrderIds);

    // 2. Immediately delete customer's orders from local store state & localStorage cache
    if (idsToDelete.length > 0) {
      await deleteOrders(idsToDelete);
    }

    // 3. Delete customer account, auth user, and orders from backend
    try {
      const q = new URLSearchParams();
      if (cleanEmail && cleanEmail !== 'no email') q.set('email', cleanEmail);
      if (cleanPhone && cleanPhone !== 'no phone') q.set('phone', cleanPhone);
      if (idsToDelete.length > 0) q.set('orderIds', idsToDelete.join(','));

      await fetch(`/api/profile?${q.toString()}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete customer account:', err);
    }

    // 4. Broadcast deletion across all tabs/windows (logs customer out without affecting admin)
    try {
      if (cleanEmail && cleanEmail !== 'no email') {
        localStorage.setItem(
          'tl_deleted_account',
          JSON.stringify({ email: cleanEmail, time: Date.now() })
        );
        localStorage.removeItem(`tl_profile_${cleanEmail}`);
      }
    } catch {}
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
