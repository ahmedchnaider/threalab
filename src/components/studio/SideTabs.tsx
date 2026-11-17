'use client';

import React from 'react';
import { Side } from '@/lib/types';

interface SideTabsProps {
  side: Side;
  hasBack: boolean;
  frontLayerCount: number;
  backLayerCount: number;
  onSideChange: (side: Side) => void;
}

export function SideTabs({
  side,
  hasBack,
  frontLayerCount,
  backLayerCount,
  onSideChange,
}: SideTabsProps) {
  if (!hasBack) return null;

  return (
    <div className="flex gap-2 justify-center mb-3">
      <button
        type="button"
        onClick={() => onSideChange('front')}
        className={`px-4 py-1.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 border-[1.5px] transition-all ${
          side === 'front'
            ? 'bg-[#141414] text-[#f4f1ea] border-[#141414]'
            : 'bg-white text-[#141414] border-[#141414] hover:bg-black/5'
        }`}
      >
        <span>Front</span>
        {frontLayerCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-[#ff4d1c] text-white text-[11px] font-bold flex items-center justify-center">
            {frontLayerCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSideChange('back')}
        className={`px-4 py-1.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 border-[1.5px] transition-all ${
          side === 'back'
            ? 'bg-[#141414] text-[#f4f1ea] border-[#141414]'
            : 'bg-white text-[#141414] border-[#141414] hover:bg-black/5'
        }`}
      >
        <span>Back</span>
        {backLayerCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-[#ff4d1c] text-white text-[11px] font-bold flex items-center justify-center">
            {backLayerCount}
          </span>
        )}
      </button>
    </div>
  );
}
