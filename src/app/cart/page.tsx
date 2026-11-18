'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CustomerProfile, Order } from '@/lib/types';
import { Minus, Plus, Trash2, Banknote, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const { cart, updateQty, removeFromCart, clearCart, cartTotal } = useCart();
  const { settings, placeOrder } = useStore();
  const { user, profile, updateProfile, getProfileByEmail } = useAuth();
  const { toast } = useToast();

  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CustomerProfile>({
    name: profile?.name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    address: profile?.address || '',
    notes: '',
  });

  // Automatically pre-fill checkout fields from saved customer profile
  React.useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        name: prev.name || profile.name || '',
        email: prev.email || profile.email || user?.email || '',
        phone: prev.phone || profile.phone || '',
        city: prev.city || profile.city || '',
        address: prev.address || profile.address || '',
        notes: prev.notes || '',
      }));
    }
  }, [profile, user]);

  const handleEmailBlur = async (inputEmail: string) => {
    const clean = (inputEmail || '').trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) return;

    try {
      const saved = await getProfileByEmail(clean);
      if (saved) {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || saved.name || '',
          phone: prev.phone || saved.phone || '',
          city: prev.city || saved.city || '',
          address: prev.address || saved.address || '',
        }));
        toast('Loaded saved details for ' + clean);
      }
    } catch {}
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length) return;

    setIsSubmitting(true);

    try {
      // Create order items details
      const orderItems = cart.flatMap((item, idx) => {
        const sides: Array<'front' | 'back'> = ['front'];
        if (item.printed.includes('back')) sides.push('back');

        return sides.map((sd) => ({
          _id: `${idx}-${sd}`,
          side: sd,
          name: item.name,
          color: item.color,
          size: item.size,
          qty: item.qty,
          mockup: item.views[sd]?.mockup || '',
          design: item.views[sd]?.design || '',
        }));
      });

      const placed = await placeOrder({
        uid: user?.id,
        total: cartTotal,
        currency: settings.currency,
        customer: formData,
        items: cart.map((i) => ({
          name: i.name,
          type: i.type,
          color: i.color,
          size: i.size,
          qty: i.qty,
          unit: i.unit,
          hasDesign: i.hasDesign,
          printed: i.printed,
          texts: i.texts,
          library: i.library,
        })),
        orderItems,
      });

      // Update profile in background
      if (user && formData.name) {
        updateProfile(formData).catch(() => {});
      }

      clearCart();
      setLastOrder(placed);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast('Could not place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Success Order State
  if (lastOrder) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-anton text-4xl sm:text-5xl uppercase tracking-wide text-[#141414]">
            Order Received!
          </h1>
          <p className="text-sm text-[#6b665d]">
            Your custom piece is in queue. Here is your tracking code:
          </p>
        </div>

        <div className="inline-block font-anton text-3xl sm:text-4xl px-8 py-3 bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl shadow-[4px_4px_0_#141414] text-[#141414] tracking-widest">
          #{lastOrder.code}
        </div>

        <p className="text-xs sm:text-sm text-[#6b665d] max-w-md mx-auto">
          We will contact you on <b>{lastOrder.customer.phone}</b> before shipping to confirm production.
          Payment is cash on delivery.
        </p>

        <div className="flex justify-center gap-3 pt-4">
          <Link
            href="/account"
            className="px-6 py-3 rounded-full bg-[#141414] hover:bg-[#ff4d1c] text-[#f4f1ea] font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Track My Orders
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-full border-[1.5px] border-[#141414] hover:bg-[#141414] hover:text-[#f4f1ea] text-[#141414] font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Keep Shopping
          </Link>
        </div>
      </div>
    );
  }

  // 2. Empty Cart State
  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6">
        <h1 className="font-anton text-4xl sm:text-5xl uppercase tracking-wide text-[#141414]">
          Your Cart
        </h1>
        <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-12 space-y-4 text-[#6b665d]">
          <p className="text-sm">Your cart is currently empty.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#141414] hover:bg-[#ff4d1c] text-[#f4f1ea] font-bold text-xs uppercase tracking-wider transition-colors"
          >
            <span>Start Designing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // 3. Normal Cart & Checkout View
  return (
    <div className="space-y-8">
      <h1 className="font-anton text-4xl sm:text-5xl uppercase tracking-wide text-[#141414]">
        Your Cart ({cart.reduce((s, i) => s + i.qty, 0)})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-7 space-y-4">
          {cart.map((item) => {
            const printedLabels = item.printed.map((s) => s.charAt(0).toUpperCase() + s.slice(1));

            return (
              <div
                key={item.key}
                className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-4 sm:p-5 flex gap-4 items-center"
              >
                {/* Mockup Previews */}
                <div className="flex gap-1.5 shrink-0">
                  {item.views.front?.mockup && (
                    <img
                      src={item.views.front.mockup}
                      alt="Front"
                      className="w-16 h-20 sm:w-20 sm:h-24 object-contain rounded-xl bg-[#ebe6dc] border border-[#ddd6c8]"
                    />
                  )}
                  {item.printed.includes('back') && item.views.back?.mockup && (
                    <img
                      src={item.views.back.mockup}
                      alt="Back"
                      className="w-16 h-20 sm:w-20 sm:h-24 object-contain rounded-xl bg-[#ebe6dc] border border-[#ddd6c8]"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-bold text-base text-[#141414] truncate">{item.name}</h3>

                  <div className="flex gap-2 items-center flex-wrap text-xs text-[#6b665d]">
                    {item.size && <span>Size {item.size}</span>}
                    {item.color && (
                      <span className="flex items-center gap-1">
                        <span>Color:</span>
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border border-black/20"
                          style={{ backgroundColor: item.color }}
                        />
                      </span>
                    )}
                    <span>·</span>
                    <span>
                      {item.hasDesign ? `Printed: ${printedLabels.join(' + ')}` : 'No print'}
                    </span>
                  </div>

                  {item.texts?.length ? (
                    <div className="text-[11px] text-[#6b665d] truncate italic">
                      "{item.texts.join(' / ')}"
                    </div>
                  ) : null}

                  {/* Quantity & Delete Controls */}
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center border border-[#141414] rounded-full overflow-hidden bg-white">
                      <button
                        onClick={() => updateQty(item.key, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-[#ebe6dc] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.key, 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-[#ebe6dc] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.key)}
                      className="text-xs text-[#b3261e] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="text-right shrink-0">
                  <span className="font-anton text-lg sm:text-xl text-[#141414]">
                    {item.unit * item.qty} {settings.currency}
                  </span>
                  <div className="text-[11px] text-[#6b665d]">
                    {item.unit} {settings.currency} each
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Checkout Delivery Form */}
        <div className="lg:col-span-5 bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 sm:p-6 space-y-5 shadow-[4px_4px_0_#141414]">
          <h2 className="font-anton text-2xl uppercase tracking-wide text-[#141414]">
            Delivery & Payment
          </h2>

          <form onSubmit={handleSubmitOrder} className="space-y-3.5 text-sm">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                maxLength={80}
                placeholder="e.g. Ahmed Ben Salem"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="For tracking updates"
                  value={formData.email}
                  onBlur={(e) => handleEmailBlur(e.target.value)}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+216 00 000 000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tunis, Sousse, Sfax"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Street and building"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                Order Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Specific instructions for delivery or print placement"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            {/* Payment banner */}
            <div className="bg-white border-[1.5px] border-[#141414] rounded-xl p-3 flex items-center gap-3">
              <Banknote className="w-6 h-6 text-[#2f7a4a] shrink-0" />
              <div>
                <b className="text-xs text-[#141414] block">Cash on Delivery</b>
                <span className="text-[11px] text-[#6b665d]">
                  Pay directly in cash when your custom pieces arrive at your door.
                </span>
              </div>
            </div>

            {/* Total Row */}
            <div className="flex justify-between items-baseline pt-3 border-t border-[#ddd6c8]">
              <span className="text-xs uppercase font-bold text-[#6b665d]">Total Amount</span>
              <span className="font-anton text-3xl text-[#141414]">
                {cartTotal} {settings.currency}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#141414] hover:bg-[#ff4d1c] disabled:opacity-50 text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3.5 rounded-full font-bold text-sm tracking-wide transition-colors"
            >
              {isSubmitting ? 'Submitting Order…' : 'Place Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
