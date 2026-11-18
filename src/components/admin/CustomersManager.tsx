'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/types';
import { Search, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

function normalizePhone(p?: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('216') && digits.length === 11) {
    return digits.slice(3);
  }
  return digits;
}

export interface CustomerStat {
  userId?: string;
  email: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: number;
  orders: Order[];
}

interface CustomersManagerProps {
  orders: Order[];
  currency: string;
  onDeleteCustomer?: (customer: CustomerStat) => Promise<void>;
  onDeleteCustomerOrders?: (email: string) => Promise<void>;
  onClearAllData?: () => Promise<void>;
}

export function CustomersManager({
  orders,
  currency,
  onDeleteCustomer,
  onDeleteCustomerOrders,
  onClearAllData,
}: CustomersManagerProps) {
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [dbProfiles, setDbProfiles] = useState<any[]>([]);
  const { toast } = useToast();

  const loadProfiles = () => {
    fetch('/api/profile?all=true')
      .then((r) => r.json())
      .then((data) => {
        if (data?.profiles) {
          setDbProfiles(data.profiles);
        }
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    loadProfiles();
  }, []);

  const handleDelete = async (customer: CustomerStat) => {
    const key = (customer.email && customer.email !== 'No email' ? customer.email : customer.phone) || 'anon';
    setIsDeletingId(key);
    try {
      if (onDeleteCustomer) {
        await onDeleteCustomer(customer);
      } else if (onDeleteCustomerOrders) {
        await onDeleteCustomerOrders(customer.email);
      }
      setDbProfiles((prev) =>
        prev.filter((p) => {
          if (customer.userId && p.user_id && p.user_id === customer.userId) return false;
          const pEmail = (p.email || '').trim().toLowerCase();
          const pPhone = normalizePhone(p.phone);
          const cEmail = (customer.email || '').trim().toLowerCase();
          const cPhone = normalizePhone(customer.phone);
          if (cEmail && cEmail !== 'no email' && pEmail === cEmail) return false;
          if (cPhone && pPhone === cPhone) return false;
          return true;
        })
      );
      setConfirmDeleteId(null);
      toast('Customer account and orders deleted');
    } catch {
      toast('Failed to delete customer account');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      if (onClearAllData) {
        await onClearAllData();
      } else {
        await fetch('/api/profile?all=true', { method: 'DELETE' });
      }
      setDbProfiles([]);
      setConfirmClearAll(false);
      toast('All customer and order data has been cleared');
    } catch {
      toast('Failed to clear data');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Aggregate customers from orders and registered profiles
  const customersMap = new Map<string, CustomerStat>();

  // 1. Add all registered customer profiles first
  for (const p of dbProfiles) {
    const email = (p.email || '').trim().toLowerCase();
    if (!email) continue;
    customersMap.set(email, {
      userId: p.user_id,
      email: p.email,
      name: p.name || 'Anonymous',
      phone: p.phone || 'No phone',
      city: p.city || 'No city',
      address: p.address || '',
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: p.last_order_at || (p.updated_at ? new Date(p.updated_at).getTime() : 0),
      orders: [],
    });
  }

  // 2. Merge order stats
  for (const o of orders) {
    const oEmail = (o.customer?.email || '').trim().toLowerCase();
    const oPhone = normalizePhone(o.customer?.phone);

    let existing = (oEmail && oEmail !== 'no email') ? customersMap.get(oEmail) : undefined;
    if (!existing && oPhone) {
      existing = Array.from(customersMap.values()).find(
        (c) => normalizePhone(c.phone) === oPhone
      );
    }
    if (!existing && o.uid) {
      existing = Array.from(customersMap.values()).find((c) => c.userId && c.userId === o.uid);
    }

    const orderTotal = o.status !== 'cancelled' ? o.total : 0;
    const key = (oEmail && oEmail !== 'no email') ? oEmail : (oPhone || o.id);

    if (!existing) {
      customersMap.set(key, {
        userId: o.uid,
        email: o.customer?.email || 'No email',
        name: o.customer?.name || 'Anonymous',
        phone: o.customer?.phone || 'No phone',
        city: o.customer?.city || 'No city',
        address: o.customer?.address || '',
        orderCount: 1,
        totalSpent: orderTotal,
        lastOrderAt: o.createdAt,
        orders: [o],
      });
    } else {
      existing.orderCount += 1;
      existing.totalSpent += orderTotal;
      if (o.createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = o.createdAt;
      }
      if (o.customer?.name && existing.name === 'Anonymous') existing.name = o.customer.name;
      if (o.customer?.phone && existing.phone === 'No phone') existing.phone = o.customer.phone;
      if (o.customer?.city && existing.city === 'No city') existing.city = o.customer.city;
      if (o.customer?.address && !existing.address) existing.address = o.customer.address;
      if (!existing.orders.some((x) => x.id === o.id)) {
        existing.orders.push(o);
      }
    }
  }

  const customers = Array.from(customersMap.values());
  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b665d]" />
          <input
            type="text"
            placeholder="Search name, email, phone or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-[#6b665d] font-medium">
            {customers.length} customer account{customers.length === 1 ? '' : 's'}
          </div>
          {(customers.length > 0 || orders.length > 0) && (
            <button
              disabled={isClearingAll}
              onClick={() => {
                if (confirmClearAll) {
                  handleClearAll();
                } else {
                  setConfirmClearAll(true);
                  setTimeout(() => setConfirmClearAll(false), 4500);
                }
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                confirmClearAll
                  ? 'bg-[#b3261e] text-white border-[#b3261e]'
                  : 'border-[#141414] text-[#141414] hover:bg-[#b3261e] hover:text-white hover:border-[#b3261e]'
              }`}
              title="Clear all customer accounts and orders"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isClearingAll
                  ? 'Clearing Data…'
                  : confirmClearAll
                  ? 'Confirm Clear All Data?'
                  : 'Clear All Data'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Customer Cards */}
      {filtered.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-12 text-center text-[#6b665d]">
          No customers found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => {
            const customerKey =
              (c.email && c.email !== 'No email' ? c.email : c.phone) || 'anon';
            const initials = c.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={c.email + c.phone}
                className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#ff4d1c] text-white font-bold flex items-center justify-center font-anton tracking-wider text-base">
                      {initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[#141414]">{c.name}</h4>
                      <div className="text-xs text-[#6b665d]">
                        {c.email} · {c.phone}
                      </div>
                      <div className="text-xs text-[#6b665d]">
                        {c.city}
                        {c.address && `, ${c.address}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#6b665d]">
                        Orders
                      </span>
                      <span className="font-anton text-lg text-[#141414]">{c.orderCount}</span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#6b665d]">
                        Total Spent
                      </span>
                      <span className="font-anton text-lg text-[#141414]">
                        {c.totalSpent} {currency}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#6b665d]">
                        Last Active
                      </span>
                      <span className="text-xs font-semibold text-[#141414]">
                        {new Date(c.lastOrderAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#ddd6c8]">
                  <button
                    onClick={() =>
                      setExpandedOrders((prev) => ({
                        ...prev,
                        [customerKey]: !prev[customerKey],
                      }))
                    }
                    className="text-xs font-bold text-[#141414] hover:text-[#ff4d1c] transition-colors"
                  >
                    {expandedOrders[customerKey] ? 'Hide Orders' : `View ${c.orderCount} Orders`}
                  </button>

                  <button
                    disabled={isDeletingId === customerKey}
                    onClick={() => {
                      if (confirmDeleteId === customerKey) {
                        handleDelete(c);
                      } else {
                        setConfirmDeleteId(customerKey);
                        setTimeout(() => setConfirmDeleteId(null), 4000);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      confirmDeleteId === customerKey
                        ? 'bg-[#b3261e] text-white border-[#b3261e]'
                        : 'border-[#b3261e] text-[#b3261e] hover:bg-[#b3261e] hover:text-white'
                    }`}
                    title="Delete customer account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {isDeletingId === customerKey
                        ? 'Deleting…'
                        : confirmDeleteId === customerKey
                        ? 'Confirm delete account?'
                        : 'Delete Account'}
                    </span>
                  </button>
                </div>

                {/* Expanded customer orders */}
                {expandedOrders[customerKey] && (
                  <div className="bg-[#ebe6dc]/40 rounded-xl p-3 space-y-2 border border-[#ddd6c8]">
                    {c.orders.map((o) => (
                      <div
                        key={o.id}
                        className="flex justify-between items-center text-xs py-1 border-b border-[#ddd6c8] last:border-0"
                      >
                        <div>
                          <b>#{o.code}</b> · {new Date(o.createdAt).toLocaleDateString()}
                          <span className="text-[#6b665d] ml-2">
                            ({o.items?.map((i) => `${i.qty}× ${i.name}`).join(', ')})
                          </span>
                        </div>
                        <div className="font-bold">
                          {o.total} {currency} · <span className="capitalize">{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
