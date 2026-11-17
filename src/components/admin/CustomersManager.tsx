'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/types';
import { Search, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface CustomerStat {
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
  onDeleteCustomerOrders: (email: string) => Promise<void>;
}

export function CustomersManager({ orders, currency, onDeleteCustomerOrders }: CustomersManagerProps) {
  const [search, setSearch] = useState('');
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Aggregate customers from orders
  const customersMap = new Map<string, CustomerStat>();

  for (const o of orders) {
    const email = o.customer.email?.trim().toLowerCase() || o.customer.phone || 'guest';
    const existing = customersMap.get(email);
    const orderTotal = o.status !== 'cancelled' ? o.total : 0;

    if (!existing) {
      customersMap.set(email, {
        email: o.customer.email || 'No email',
        name: o.customer.name || 'Anonymous',
        phone: o.customer.phone || 'No phone',
        city: o.customer.city || 'No city',
        address: o.customer.address || '',
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
      existing.orders.push(o);
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

        <div className="text-xs text-[#6b665d] font-medium">
          {customers.length} customer account{customers.length === 1 ? '' : 's'}
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
                        [c.email]: !prev[c.email],
                      }))
                    }
                    className="text-xs font-bold text-[#141414] hover:text-[#ff4d1c] transition-colors"
                  >
                    {expandedOrders[c.email] ? 'Hide Orders' : `View ${c.orderCount} Orders`}
                  </button>

                  <button
                    onClick={() => {
                      if (confirmDeleteEmail === c.email) {
                        onDeleteCustomerOrders(c.email);
                        setConfirmDeleteEmail(null);
                        toast('Customer records deleted');
                      } else {
                        setConfirmDeleteEmail(c.email);
                        setTimeout(() => setConfirmDeleteEmail(null), 3500);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      confirmDeleteEmail === c.email
                        ? 'bg-[#b3261e] text-white border-[#b3261e]'
                        : 'border-[#b3261e] text-[#b3261e] hover:bg-[#b3261e] hover:text-white'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{confirmDeleteEmail === c.email ? 'Confirm delete?' : 'Delete'}</span>
                  </button>
                </div>

                {/* Expanded customer orders */}
                {expandedOrders[c.email] && (
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
