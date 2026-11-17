'use client';

import React, { useState } from 'react';
import { StoreSettings } from '@/lib/types';

interface SettingsManagerProps {
  settings: StoreSettings;
  onSave: (settings: StoreSettings) => Promise<void>;
}

export function SettingsManager({ settings, onSave }: SettingsManagerProps) {
  const [form, setForm] = useState<StoreSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(form);
    setIsSaving(false);
  };

  return (
    <div className="max-w-xl bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-6 space-y-6">
      <h4 className="font-anton text-xl tracking-wide uppercase text-[#141414]">
        Store Details & Branding
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
            Store Name
          </label>
          <input
            type="text"
            required
            maxLength={40}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
            Currency Symbol / Code
          </label>
          <input
            type="text"
            required
            maxLength={6}
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
            Homepage Tagline
          </label>
          <textarea
            rows={3}
            maxLength={250}
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-[#141414] hover:bg-[#ff4d1c] text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3 rounded-full font-bold text-sm transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Store Details'}
        </button>
      </form>
    </div>
  );
}
