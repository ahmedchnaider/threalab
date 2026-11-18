'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock } from 'lucide-react';

export function AdminLock() {
  const { unlockAdmin } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const ok = await unlockAdmin(password);
    setIsSubmitting(false);
    if (!ok) {
      setError('Wrong password. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-6 sm:p-8 shadow-[6px_6px_0_#141414]">
        <div className="w-12 h-12 rounded-full bg-[#141414] text-[#f4f1ea] flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-[#ff4d1c]" />
        </div>

        <h2 className="font-anton text-3xl tracking-wide uppercase text-[#141414] mb-2">
          Admin Panel
        </h2>
        <p className="text-sm text-[#6b665d] mb-6">
          Enter the store admin password to manage products, customer orders, and store settings.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-white border-[1.5px] border-[#141414] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
            />
          </div>

          {error && <div className="text-xs text-[#b3261e] font-medium">{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#141414] hover:bg-[#ff4d1c] text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3 rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Verifying…' : 'Unlock Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
