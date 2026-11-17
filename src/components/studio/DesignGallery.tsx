'use client';

import React, { useState } from 'react';
import { Design } from '@/lib/types';

interface DesignGalleryProps {
  designs: Design[];
  onSelectDesign: (design: Design) => void;
}

export function DesignGallery({ designs, onSelectDesign }: DesignGalleryProps) {
  const [selectedCat, setSelectedCat] = useState<string>('');

  const activeDesigns = designs.filter((d) => d.active && d.image);
  if (activeDesigns.length === 0) return null;

  const categories = Array.from(new Set(activeDesigns.map((d) => d.category).filter(Boolean)));
  const filtered = selectedCat
    ? activeDesigns.filter((d) => d.category === selectedCat)
    : activeDesigns;

  return (
    <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-4 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b665d]">
        Pick a ready-made design
      </h4>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedCat('')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              selectedCat === ''
                ? 'bg-[#141414] text-[#f4f1ea] border-[#141414]'
                : 'bg-transparent text-[#141414] border-[#ddd6c8] hover:border-[#141414]'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCat(c)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                selectedCat === c
                  ? 'bg-[#141414] text-[#f4f1ea] border-[#141414]'
                  : 'bg-transparent text-[#141414] border-[#ddd6c8] hover:border-[#141414]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
        {filtered.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelectDesign(d)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#ddd6c8] hover:border-[#ff4d1c] bg-white transition-all group text-center"
            title={`Add "${d.name}"`}
          >
            <div className="w-full aspect-square rounded-lg checker-bg flex items-center justify-center p-1 overflow-hidden group-hover:scale-105 transition-transform">
              <img src={d.image} alt={d.name} className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] font-medium text-[#141414] truncate w-full">
              {d.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
