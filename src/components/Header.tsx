'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { ShoppingBag, User, ShieldCheck } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { user, profile, isAdmin } = useAuth();
  const { settings } = useStore();

  const brandName = (settings.name || 'THREADLAB').toUpperCase();
  const splitIdx = brandName.lastIndexOf(' ') > 0 ? brandName.lastIndexOf(' ') + 1 : Math.max(1, brandName.length - 3);
  const brandStart = brandName.slice(0, splitIdx);
  const brandEnd = brandName.slice(splitIdx);

  const navClasses = (path: string) =>
    `px-4 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-1.5 border border-transparent ${
      pathname === path
        ? 'bg-[#141414] text-[#f4f1ea]'
        : 'text-[#141414] hover:border-[#141414]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#f4f1ea]/90 backdrop-blur-md border-b-[1.5px] border-[#141414]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="font-anton text-2xl sm:text-3xl tracking-wide uppercase hover:opacity-90 transition-opacity">
          {brandStart}
          <span className="text-[#ff4d1c]">{brandEnd}</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className={navClasses('/')}>
            Shop
          </Link>

          <Link href="/studio" className={navClasses('/studio')}>
            Studio
          </Link>

          <Link href="/account" className={navClasses('/account')}>
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">
              {profile?.name ? profile.name.split(' ')[0] : 'Account'}
            </span>
          </Link>

          <Link href="/cart" className={navClasses('/cart')}>
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff4d1c] text-white text-xs font-bold font-mono">
                {cartCount}
              </span>
            )}
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 border ${
                pathname.startsWith('/admin')
                  ? 'bg-[#ff4d1c] text-white border-[#ff4d1c]'
                  : 'bg-[#141414] text-white hover:bg-[#ff4d1c] border-[#141414]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
