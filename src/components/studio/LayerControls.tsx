'use client';

import React from 'react';
import { Layer, PrintArea, TextLayer } from '@/lib/types';
import { FONTS } from '@/lib/canvas-utils';
import { RotateCcw, AlignCenter } from 'lucide-react';

interface LayerControlsProps {
  layer: Layer | null;
  area: PrintArea;
  onUpdate: (updates: Partial<Layer>) => void;
}

export function LayerControls({ layer, area, onUpdate }: LayerControlsProps) {
  if (!layer) return null;

  const isText = layer.type === 'text';
  const textLayer = isText ? (layer as TextLayer) : null;

  const handleCenter = () => {
    onUpdate({
      cx: area.x + area.w / 2,
      cy: area.y + area.h / 2,
    });
  };

  const handleStraighten = () => {
    onUpdate({ rot: 0 });
  };

  return (
    <div className="border-t-[1.5px] border-[#ddd6c8] pt-4 mt-4 space-y-3">
      {isText && textLayer && (
        <>
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <span className="text-xs font-semibold text-[#6b665d] uppercase tracking-wider">
              Text
            </span>
            <input
              type="text"
              value={textLayer.text}
              maxLength={60}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-white border-[1.5px] border-[#141414] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
            />
          </div>

          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <span className="text-xs font-semibold text-[#6b665d] uppercase tracking-wider">
              Font
            </span>
            <select
              value={textLayer.font}
              onChange={(e) => onUpdate({ font: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-white border-[1.5px] border-[#141414] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
            >
              {FONTS.map((f) => (
                <option key={f.n} value={f.n}>
                  {f.n}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <span className="text-xs font-semibold text-[#6b665d] uppercase tracking-wider">
              Color
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={textLayer.color}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="w-9 h-8 p-0.5 rounded-lg border-[1.5px] border-[#141414] bg-white cursor-pointer"
              />
              <span className="font-mono text-xs text-[#6b665d]">{textLayer.color}</span>
            </div>
          </div>
        </>
      )}

      {/* Scale Slider */}
      <div className="grid grid-cols-[80px_1fr] items-center gap-2">
        <span className="text-xs font-semibold text-[#6b665d] uppercase tracking-wider">
          Size
        </span>
        <input
          type="range"
          min={10}
          max={400}
          value={Math.round(layer.s * 100)}
          onChange={(e) => onUpdate({ s: Number(e.target.value) / 100 })}
          className="w-full accent-[#ff4d1c] cursor-pointer"
        />
      </div>

      {/* Rotation Slider */}
      <div className="grid grid-cols-[80px_1fr] items-center gap-2">
        <span className="text-xs font-semibold text-[#6b665d] uppercase tracking-wider">
          Rotate
        </span>
        <input
          type="range"
          min={-180}
          max={180}
          value={layer.rot}
          onChange={(e) => onUpdate({ rot: Number(e.target.value) })}
          className="w-full accent-[#ff4d1c] cursor-pointer"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleCenter}
          className="px-3 py-1.5 rounded-lg border border-[#141414] hover:bg-[#141414] hover:text-[#f4f1ea] text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <AlignCenter className="w-3.5 h-3.5" />
          <span>Center</span>
        </button>
        <button
          type="button"
          onClick={handleStraighten}
          className="px-3 py-1.5 rounded-lg border border-[#141414] hover:bg-[#141414] hover:text-[#f4f1ea] text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Straighten</span>
        </button>
      </div>
    </div>
  );
}
