'use client';

import React from 'react';
import { Layer } from '@/lib/types';
import { ArrowUp, Trash2 } from 'lucide-react';

interface LayerListProps {
  layers: Layer[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onBringForward: (index: number) => void;
}

export function LayerList({
  layers,
  selectedIndex,
  onSelect,
  onDelete,
  onBringForward,
}: LayerListProps) {
  if (layers.length === 0) {
    return (
      <div className="text-xs text-[#6b665d] italic py-2">
        Nothing added to this side yet. Upload your logo or artwork, or add custom text above.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 mt-2">
      {layers.map((l, idx) => {
        const isSelected = selectedIndex === idx;
        const isText = l.type === 'text';

        return (
          <div
            key={l.id}
            onClick={() => onSelect(idx)}
            className={`flex items-center gap-2.5 p-2 rounded-xl border-[1.5px] bg-white cursor-pointer transition-all ${
              isSelected ? 'border-[#ff4d1c] shadow-sm' : 'border-[#ddd6c8] hover:border-black/40'
            }`}
          >
            {/* Visual Icon */}
            {isText ? (
              <div
                className="w-8 h-8 rounded-lg bg-[#ebe6dc] flex items-center justify-center font-bold text-xs"
                style={{ fontFamily: l.font }}
              >
                Aa
              </div>
            ) : (
              <img
                src={l.src}
                alt=""
                className="w-8 h-8 rounded-lg object-contain bg-[#ebe6dc] p-0.5"
              />
            )}

            {/* Label */}
            <span className="flex-1 text-xs sm:text-sm font-medium truncate text-[#141414]">
              {isText ? l.text : l.name || 'Image'}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {idx < layers.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBringForward(idx);
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-[#ebe6dc] text-[#141414] flex items-center justify-center transition-colors"
                  title="Bring forward"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(idx);
                }}
                className="w-7 h-7 rounded-lg hover:bg-red-50 text-[#b3261e] flex items-center justify-center transition-colors"
                title="Remove layer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
