'use client';

import React, { useEffect, useState } from 'react';
import { LightboxItem } from '@/lib/types';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LightboxProps {
  items: LightboxItem[];
  initialIndex?: number;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Lightbox({ items, initialIndex = 0, title, isOpen, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + items.length) % items.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % items.length);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, items.length, onClose]);

  if (!isOpen || !items.length) return null;

  const current = items[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#0f0f0f]/95 flex flex-col justify-between text-white backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
        <span className="font-anton text-xl tracking-wider uppercase text-[#f4f1ea]">
          {title || current.label}
        </span>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        {items.length > 1 && (
          <button
            onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
            className="absolute left-6 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <figure className="flex flex-col items-center max-w-full max-h-full">
          <img
            src={current.src}
            alt={current.label}
            className={`max-w-[85vw] max-h-[72vh] object-contain rounded-xl shadow-2xl ${
              current.checker ? 'checker-bg' : 'bg-[#ebe6dc]'
            }`}
          />
          <figcaption className="mt-3 text-sm text-[#ddd6c8]/80 text-center font-medium">
            {current.label} {items.length > 1 && `(${index + 1} of ${items.length})`}
          </figcaption>
        </figure>

        {items.length > 1 && (
          <button
            onClick={() => setIndex((i) => (i + 1) % items.length)}
            className="absolute right-6 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {items.length > 1 && (
        <div className="flex justify-center gap-3 py-4 px-6 border-t border-white/10 overflow-x-auto">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setIndex(idx)}
              className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition-all p-1 bg-[#ebe6dc] ${
                index === idx ? 'border-[#ff4d1c] opacity-100 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={item.src} alt="" className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
