'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { CustomerProfile, OrderStatus } from '@/lib/types';
import { formatMediaUrl } from '@/lib/garments';
import { LogOut, Eye, CheckCircle2, XCircle, Clock, Truck, Package, Mail, KeyRound, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const {
    user,
    profile,
    login,
    verifyOtp,
    signup,
    logout,
    updateProfile,
    getProfileByEmail,
    deleteAccount,
    isLoading,
  } = useAuth();
  const { orders, settings, cancelOrder } = useStore();
  const { toast } = useToast();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [waitingForOtp, setWaitingForOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  // Profile Form state
  const [profileForm, setProfileForm] = useState<CustomerProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tl_profile');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      name: profile?.name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      city: profile?.city || '',
      address: profile?.address || '',
    };
  });

  const [expandedDesigns, setExpandedDesigns] = useState<Record<string, boolean>>({});
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmDeleteMyAccount, setConfirmDeleteMyAccount] = useState(false);
  const [isDeletingMyAccount, setIsDeletingMyAccount] = useState(false);

  const handleDeleteMyAccount = async () => {
    setIsDeletingMyAccount(true);
    try {
      await deleteAccount(profileForm.email || user?.email);
    } finally {
      setIsDeletingMyAccount(false);
      setConfirmDeleteMyAccount(false);
    }
  };

  // Sync profile form when profile loads
  React.useEffect(() => {
    if (profile) {
      setProfileForm((prev) => ({
        name: profile.name || prev.name || '',
        email: profile.email || user?.email || prev.email || '',
        phone: profile.phone || prev.phone || '',
        city: profile.city || prev.city || '',
        address: profile.address || prev.address || '',
      }));
    }
  }, [profile, user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError('');

    if (waitingForOtp) {
      const res = await verifyOtp(email, otpToken);
      if (!res.success) {
        setAuthError(res.error || 'Invalid or expired code. Please try again.');
      } else {
        setWaitingForOtp(false);
      }
      setIsSubmitting(false);
      return;
    }

    if (authMode === 'signin') {
      const res = await login(email);
      if (!res.success) {
        setAuthError(res.error || 'Failed to sign in');
      } else if (res.requiresOtp) {
        setWaitingForOtp(true);
      }
    } else if (authMode === 'signup') {
      const res = await signup({
        name,
        email,
        phone,
        city,
        address,
      });
      if (!res.success) {
        setAuthError(res.error || 'Failed to create account');
      } else if (res.requiresOtp) {
        setWaitingForOtp(true);
      }
    }
    setIsSubmitting(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveSuccess(false);
    try {
      await updateProfile(profileForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProfileEmailBlur = async (inputEmail: string) => {
    const clean = (inputEmail || '').trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) return;
    try {
      const saved = await getProfileByEmail(clean);
      if (saved) {
        setProfileForm((prev) => ({
          name: saved.name || prev.name || '',
          email: clean,
          phone: saved.phone || prev.phone || '',
          city: saved.city || prev.city || '',
          address: saved.address || prev.address || '',
        }));
        toast('Loaded saved details for ' + clean);
      }
    } catch {}
  };

  const handleAuthEmailBlur = async (inputEmail: string) => {
    const clean = (inputEmail || '').trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) return;
    try {
      const saved = await getProfileByEmail(clean);
      if (saved) {
        if (!name && saved.name) setName(saved.name);
        if (!phone && saved.phone) setPhone(saved.phone);
        if (!city && saved.city) setCity(saved.city);
        if (!address && saved.address) setAddress(saved.address);
      }
    } catch {}
  };

  // Filter orders for this customer (by user ID or email)
  const myOrders = orders.filter((o) => {
    if (user && o.uid === user.id) return true;
    if (profile?.email && o.customer?.email?.toLowerCase() === profile.email.toLowerCase()) return true;
    return false;
  });

  if (isLoading) {
    return (
      <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-16 text-center text-[#6b665d]">
        Loading your account…
      </div>
    );
  }

  // 1. Not Logged In View (Passwordless)
  if (!user && !profile) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-6 sm:p-8 space-y-6 shadow-[6px_6px_0_#141414]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] text-[#f4f1ea] text-[11px] font-bold uppercase tracking-wider mb-2">
              <Mail className="w-3 h-3 text-[#ff4d1c]" />
              <span>Passwordless Sign-In</span>
            </div>
            <h1 className="font-anton text-3xl uppercase tracking-wide text-[#141414]">
              {waitingForOtp
                ? 'Check Your Email'
                : authMode === 'signin'
                ? 'Log in to Threadlab'
                : 'Create Account'}
            </h1>
            <p className="text-xs text-[#6b665d] mt-1 leading-relaxed">
              {waitingForOtp
                ? `We sent a 6-digit code / magic link to ${email}. Enter the code below or click the link in your email.`
                : authMode === 'signin'
                ? 'No password required! Simply enter your email address to sign in.'
                : 'Fill in your delivery info. You will never need to remember a password.'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-sm">
            {waitingForOtp ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b665d]" />
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={10}
                    placeholder="e.g. 123456"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border-[1.5px] border-[#141414] rounded-xl font-mono text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                  />
                </div>
              </div>
            ) : (
              <>
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmed Ben Salem"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onBlur={(e) => handleAuthEmailBlur(e.target.value)}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                  />
                </div>

                {authMode === 'signup' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+216 00 000 000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tunis"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        placeholder="Your delivery address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {authError && <div className="text-xs text-[#b3261e] font-semibold">{authError}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#141414] hover:bg-[#ff4d1c] disabled:opacity-50 text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3 rounded-full font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2"
            >
              <span>
                {isSubmitting
                  ? 'Connecting…'
                  : waitingForOtp
                  ? 'Verify Code & Sign In'
                  : authMode === 'signin'
                  ? 'Continue with Email'
                  : 'Create Free Account'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {waitingForOtp && (
              <div className="flex flex-col gap-2 pt-1 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSubmitting(true);
                    setAuthError('');
                    const res = await login(email);
                    if (!res.success) {
                      setAuthError(res.error || 'Failed to sign in');
                    } else {
                      setWaitingForOtp(false);
                    }
                    setIsSubmitting(false);
                  }}
                  className="w-full bg-[#ff4d1c]/10 hover:bg-[#ff4d1c]/20 text-[#ff4d1c] border border-[#ff4d1c]/30 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  ⚡ Instant One-Click Sign In (Bypass Email Code)
                </button>
                <button
                  type="button"
                  onClick={() => setWaitingForOtp(false)}
                  className="w-full text-center text-xs text-[#6b665d] hover:underline"
                >
                  Use a different email address
                </button>
              </div>
            )}
          </form>

          {/* Toggle modes */}
          {!waitingForOtp && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[#ddd6c8] text-xs">
              {authMode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                  }}
                  className="text-left font-bold text-[#141414] hover:underline"
                >
                  New here? Create an account in 30 seconds →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthError('');
                  }}
                  className="text-left font-bold text-[#141414] hover:underline"
                >
                  Already have an account? Sign in with email →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Logged In Customer Profile & Orders View
  const initials = (profile?.name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 bg-[#ff4d1c] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <Clock className="w-3 h-3" />
            <span>New</span>
          </span>
        );
      case 'in production':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <Package className="w-3 h-3" />
            <span>In Production</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <Truck className="w-3 h-3" />
            <span>Shipped</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 bg-[#2f7a4a] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" />
            <span>Delivered</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-zinc-400 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#ff4d1c] text-white font-bold flex items-center justify-center font-anton tracking-wider text-xl">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              <h2 className="font-bold text-lg text-[#141414]">
                {profile?.name || user?.email?.split('@')[0]}
              </h2>
            </div>
            <div className="text-xs text-[#6b665d]">{user?.email || profile?.email}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-full border border-[#141414] hover:bg-[#141414] hover:text-[#f4f1ea] text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>

      {/* Orders and Profile Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Orders */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-anton text-2xl uppercase tracking-wide text-[#141414]">
            My Orders ({myOrders.length})
          </h3>

          {myOrders.length === 0 ? (
            <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-12 text-center space-y-3 text-[#6b665d]">
              <p className="text-sm">You haven't placed any orders yet.</p>
              <Link
                href="/"
                className="inline-block px-5 py-2 rounded-full bg-[#141414] text-[#f4f1ea] text-xs font-bold hover:bg-[#ff4d1c] transition-colors"
              >
                Start Designing Now
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map((o) => {
                const hasDesigns = Boolean(o.orderItems?.length);

                return (
                  <div
                    key={o.id}
                    className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-anton text-lg text-[#141414]">
                            #{o.code}
                          </span>
                          <span className="text-xs text-[#6b665d]">
                            · {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-[#6b665d] mt-0.5">
                          {o.items?.map((it) => `${it.qty}× ${it.name}`).join(', ')}
                        </div>
                        <div className="text-xs text-[#6b665d]">
                          Deliver to: {o.customer.city}, {o.customer.address}
                        </div>
                      </div>

                      <div className="text-right space-y-1.5">
                        <div>{statusBadge(o.status)}</div>
                        <div className="font-anton text-lg text-[#141414]">
                          {o.total} {settings.currency}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#ddd6c8]">
                      {hasDesigns ? (
                        <button
                          onClick={() =>
                            setExpandedDesigns((prev) => ({
                              ...prev,
                              [o.id]: !prev[o.id],
                            }))
                          }
                          className="text-xs font-bold text-[#141414] hover:text-[#ff4d1c] flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            {expandedDesigns[o.id] ? 'Hide Artwork' : 'View Artwork Previews'}
                          </span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {o.status === 'new' && (
                        <button
                          onClick={() => {
                            if (confirmCancelId === o.id) {
                              cancelOrder(o.id);
                              setConfirmCancelId(null);
                            } else {
                              setConfirmCancelId(o.id);
                              setTimeout(() => setConfirmCancelId(null), 4000);
                            }
                          }}
                          className={`text-xs font-bold px-3 py-1 rounded-lg border transition-colors ${
                            confirmCancelId === o.id
                              ? 'bg-[#b3261e] text-white border-[#b3261e]'
                              : 'text-[#b3261e] border-[#b3261e] hover:bg-[#b3261e] hover:text-white'
                          }`}
                        >
                          {confirmCancelId === o.id ? 'Click to confirm cancel' : 'Cancel Order'}
                        </button>
                      )}

                      {o.status === 'in production' && (
                        <span className="text-[11px] text-[#6b665d]">
                          In production (cannot be cancelled)
                        </span>
                      )}
                    </div>

                    {/* Artwork Preview Modal inside Card */}
                    {expandedDesigns[o.id] && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#ddd6c8]">
                        {o.orderItems?.map((item, idx) => {
                          const mockupSrc = formatMediaUrl(item.mockup);
                          const designSrc = formatMediaUrl(item.design);

                          return (
                            <div
                              key={idx}
                              className="bg-[#ebe6dc]/50 p-2.5 rounded-xl border border-[#ddd6c8] space-y-1.5 text-xs text-center"
                            >
                              <div className="grid grid-cols-2 gap-1.5">
                                <img
                                  src={mockupSrc}
                                  alt="Mockup"
                                  className="w-full aspect-[6/7] object-contain rounded bg-[#ebe6dc]"
                                />
                                {designSrc ? (
                                  <img
                                    src={designSrc}
                                    alt="Print file"
                                    className="w-full aspect-[6/7] object-contain rounded checker-bg"
                                  />
                                ) : (
                                  <div className="w-full aspect-[6/7] rounded bg-[#ebe6dc] flex items-center justify-center text-[10px] text-[#6b665d]">
                                    No artwork
                                  </div>
                                )}
                              </div>
                              <span className="block text-[11px] font-bold truncate">
                                {item.side} view ({item.name})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Customer Profile Details */}
        <div className="lg:col-span-5 bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[4px_4px_0_#141414]">
          <h3 className="font-anton text-2xl uppercase tracking-wide text-[#141414]">
            My Details
          </h3>
          <p className="text-xs text-[#6b665d]">
            Saved to your profile and automatically pre-filled at checkout.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-sm">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={profileForm.email}
                onBlur={(e) => handleProfileEmailBlur(e.target.value)}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                Phone
              </label>
              <input
                type="tel"
                required
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                City
              </label>
              <input
                type="text"
                required
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                Street Address
              </label>
              <input
                type="text"
                required
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full bg-[#141414] hover:bg-[#ff4d1c] text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3 rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSavingProfile ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Details…</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#ff4d1c]" />
                  <span>Profile Details Saved ✓</span>
                </>
              ) : (
                <span>Save Profile Details</span>
              )}
            </button>

            <div className="pt-4 border-t border-[#ddd6c8] flex justify-between items-center">
              <span className="text-xs text-[#6b665d]">Account Management:</span>
              <button
                type="button"
                disabled={isDeletingMyAccount}
                onClick={() => {
                  if (confirmDeleteMyAccount) {
                    handleDeleteMyAccount();
                  } else {
                    setConfirmDeleteMyAccount(true);
                    setTimeout(() => setConfirmDeleteMyAccount(false), 4500);
                  }
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  confirmDeleteMyAccount
                    ? 'bg-[#b3261e] text-white border-[#b3261e]'
                    : 'border-[#b3261e] text-[#b3261e] hover:bg-[#b3261e] hover:text-white'
                }`}
              >
                {isDeletingMyAccount
                  ? 'Deleting Account…'
                  : confirmDeleteMyAccount
                  ? 'Confirm Delete Account & Log Out?'
                  : 'Delete My Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
