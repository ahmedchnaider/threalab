'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { GARMENTS, svgURL } from '@/lib/garments';
import { Maximize2, Sparkles } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  currency: string;
  onZoom: (product: Product, color: string) => void;
}

export function ProductCard({ product, currency, onZoom }: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || '#ffffff');
  const garment = GARMENTS[product.type] || GARMENTS.tshirt;

  const currentThumb =
    product.photo || svgURL(product.type, selectedColor, 'front');

  return (
    <article className="group bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_#141414]">
      {/* Thumbnail Stage */}
      <div className="relative bg-[#ebe6dc] aspect-[6/7] flex items-center justify-center p-4 overflow-hidden">
        <Link href={`/studio?product=${product.id}&color=${encodeURIComponent(selectedColor)}`} className="w-full h-full flex items-center justify-center">
          <img
            src={currentThumb}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </Link>

        {/* Fullscreen Zoom Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onZoom(product, selectedColor);
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#fffdf8]/90 border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-white flex items-center justify-center transition-all z-10"
          title="View full screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Meta Content */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className="font-bold text-lg text-[#141414] leading-tight">
            {product.name}
          </h3>
          <span className="font-anton text-lg tracking-wide text-[#141414]">
            {product.price} {currency}
          </span>
        </div>

        <div className="text-xs text-[#6b665d]">
          {garment.label}
          {product.printPrice > 0 && ` · custom print +${product.printPrice} ${currency}`}
        </div>

        {/* Color swatches */}
        {product.colors.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center mt-1">
            {product.colors.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full border border-black/25 transition-transform ${
                  selectedColor === c ? 'ring-2 ring-[#141414] ring-offset-2 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}

        {/* Action Button */}
        <Link
          href={`/studio?product=${product.id}&color=${encodeURIComponent(selectedColor)}`}
          className="mt-auto pt-2"
        >
          <button className="w-full bg-[#141414] text-[#f4f1ea] hover:bg-[#ff4d1c] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-2.5 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-colors">
            <Sparkles className="w-4 h-4" />
            <span>Customize</span>
          </button>
        </Link>
      </div>
    </article>
  );
}
