'use client';

import React, { useState } from 'react';
import { Order, OrderStatus } from '@/lib/types';
import { Trash2, Copy, Check, Eye, ExternalLink } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { formatMediaUrl } from '@/lib/garments';

interface OrdersManagerProps {
  orders: Order[];
  currency: string;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
}

const STATUSES: OrderStatus[] = ['new', 'in production', 'shipped', 'delivered', 'cancelled'];

export function OrdersManager({ orders, currency, onUpdateStatus, onDeleteOrder }: OrdersManagerProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [expandedDesigns, setExpandedDesigns] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const cities = Array.from(
    new Set(orders.map((o) => o.customer?.city?.trim()).filter(Boolean))
  ) as string[];

  const filteredOrders = orders.filter((o) => {
    const statusMatch = filterStatus === 'all' || o.status === filterStatus;
    const cityMatch = filterCity === 'all' || o.customer?.city?.trim().toLowerCase() === filterCity.toLowerCase();
    return statusMatch && cityMatch;
  });

  const totalRevenue = filteredOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const toggleDesigns = (id: string) => {
    setExpandedDesigns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyPrintLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    toast('Print file link copied to clipboard');
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const statusColor = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return 'bg-[#ff4d1c] text-white';
      case 'in production':
        return 'bg-amber-500 text-white';
      case 'shipped':
        return 'bg-blue-600 text-white';
      case 'delivered':
        return 'bg-[#2f7a4a] text-white';
      case 'cancelled':
        return 'bg-zinc-400 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b665d]">
              Status:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#141414] rounded-lg"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b665d]">
              City:
            </span>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#141414] rounded-lg"
            >
              <option value="all">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-[#6b665d] font-medium flex items-center gap-2">
          <span>
            {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
          </span>
          <span>•</span>
          <span className="font-bold text-[#141414] font-anton text-base">
            {totalRevenue} {currency}
          </span>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-12 text-center text-[#6b665d]">
          No orders matching current filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((o) => {
            const hasDesigns = Boolean(o.orderItems?.length);

            return (
              <div
                key={o.id}
                className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 space-y-4 transition-all"
              >
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-anton text-lg text-[#141414]">
                        #{o.code}
                      </span>
                      <span className="text-xs text-[#6b665d]">
                        · {new Date(o.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-[#141414]">
                      {o.customer.name} · {o.customer.phone}
                      {o.customer.email && ` · ${o.customer.email}`}
                    </div>

                    <div className="text-xs text-[#6b665d]">
                      {o.customer.city}, {o.customer.address}
                    </div>

                    {o.customer.notes && (
                      <div className="text-xs italic text-[#ff4d1c] bg-[#ff4d1c]/10 px-2 py-1 rounded inline-block">
                        Note: {o.customer.notes}
                      </div>
                    )}

                    {o.cancelledBy && (
                      <div className="text-xs font-semibold text-[#b3261e]">
                        Cancelled by {o.cancelledBy}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-anton text-xl tracking-wide text-[#141414]">
                      {o.total} {currency}
                    </span>

                    <div className="flex items-center gap-2">
                      <select
                        value={o.status}
                        onChange={(e) => onUpdateStatus(o.id, e.target.value as OrderStatus)}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-black/20 ${statusColor(
                          o.status
                        )}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-white text-black">
                            {s}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          if (confirmDeleteId === o.id) {
                            onDeleteOrder(o.id);
                            setConfirmDeleteId(null);
                          } else {
                            setConfirmDeleteId(o.id);
                            setTimeout(() => setConfirmDeleteId(null), 3500);
                          }
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          confirmDeleteId === o.id
                            ? 'bg-[#b3261e] text-white border-[#b3261e]'
                            : 'border-[#b3261e] text-[#b3261e] hover:bg-[#b3261e] hover:text-white'
                        }`}
                        title={confirmDeleteId === o.id ? 'Click again to confirm' : 'Delete order'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="text-xs text-[#6b665d] border-t border-[#ddd6c8] pt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {o.items?.map((it, idx) => (
                    <span key={idx}>
                      <b className="text-[#141414]">{it.qty}×</b> {it.name}
                      {it.size && ` (${it.size})`}
                      {it.color && ` · ${it.color}`}
                      {it.texts?.length ? ` · "${it.texts.join(' / ')}"` : ''}
                    </span>
                  ))}
                </div>

                {/* Toggle Designs Button */}
                {hasDesigns && (
                  <div>
                    <button
                      onClick={() => toggleDesigns(o.id)}
                      className="px-3 py-1.5 rounded-lg bg-black text-white hover:bg-[#ff4d1c] text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {expandedDesigns[o.id] ? 'Hide Print Files' : 'View Artwork & Print Files'}
                      </span>
                    </button>

                    {expandedDesigns[o.id] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 p-4 bg-[#ebe6dc]/50 rounded-xl border border-[#ddd6c8]">
                        {o.orderItems?.map((item, idx) => {
                          const mockupSrc = formatMediaUrl(item.mockup);
                          const designSrc = formatMediaUrl(item.design);

                          return (
                            <div
                              key={idx}
                              className="bg-white border border-[#ddd6c8] rounded-xl p-3 space-y-2 text-xs"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  {mockupSrc ? (
                                    <a
                                      href={mockupSrc}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block group relative"
                                      title="Click to view full mockup"
                                    >
                                      <img
                                        src={mockupSrc}
                                        alt="Mockup"
                                        className="w-full aspect-[6/7] object-contain rounded-lg bg-[#ebe6dc] border border-[#ddd6c8]"
                                      />
                                      <span className="absolute bottom-1 right-1 bg-black/70 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="w-3 h-3" />
                                      </span>
                                    </a>
                                  ) : (
                                    <div className="w-full aspect-[6/7] rounded-lg bg-[#ebe6dc] flex items-center justify-center text-[#6b665d] text-[10px]">
                                      No mockup
                                    </div>
                                  )}
                                  <span className="block text-[10px] text-center text-[#6b665d] mt-1 uppercase font-semibold">
                                    {item.side} Mockup
                                  </span>
                                </div>

                                <div>
                                  {designSrc ? (
                                    <a
                                      href={designSrc}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block group relative"
                                      title="Click to view high-res print PNG"
                                    >
                                      <img
                                        src={designSrc}
                                        alt="Print File"
                                        className="w-full aspect-[6/7] object-contain rounded-lg checker-bg border border-[#ddd6c8]"
                                      />
                                      <span className="absolute bottom-1 right-1 bg-black/70 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="w-3 h-3" />
                                      </span>
                                    </a>
                                  ) : (
                                    <div className="w-full aspect-[6/7] rounded-lg bg-[#ebe6dc] flex items-center justify-center text-[#6b665d] text-[10px] text-center p-2">
                                      No custom print
                                    </div>
                                  )}
                                  <span className="block text-[10px] text-center text-[#6b665d] mt-1 uppercase font-semibold">
                                    {item.side} Print File
                                  </span>
                                </div>
                              </div>

                              <div className="font-bold text-[#141414] truncate">
                                {item.qty}× {item.name} {item.size && `(${item.size})`}
                              </div>

                              {designSrc && (
                                <div className="flex gap-1.5 pt-1">
                                  <button
                                    onClick={() => copyPrintLink(designSrc)}
                                    className="flex-1 py-1.5 px-2 rounded-lg border border-[#141414] hover:bg-[#141414] hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                                  >
                                    {copiedLink === designSrc ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Link</span>
                                      </>
                                    )}
                                  </button>

                                  <a
                                    href={designSrc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={`${item.name}-${item.side}-print.png`}
                                    className="py-1.5 px-2.5 rounded-lg bg-[#141414] hover:bg-[#ff4d1c] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                                    title="Open / Download PNG"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
