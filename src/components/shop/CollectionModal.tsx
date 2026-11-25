'use client';

import React, { useState, useEffect } from 'react';
import { Collection, CollectionImage, CartItem, Side } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

interface CollectionModalProps {
  collection: Collection | null;
  currency: string;
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export function CollectionModal({
  collection,
  currency,
  isOpen,
  initialIndex = 0,
  onClose,
}: CollectionModalProps) {
  const { addToCart } = useCart();
  const [index, setIndex] = useState(initialIndex);
  const [size, setSize] = useState<string>('L');
  const [qty, setQty] = useState<number>(1);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const images = collection?.images || [];
  const currentImage: CollectionImage | undefined = images[index];

  const availableSizes =
    currentImage?.sizes && currentImage.sizes.length > 0
      ? currentImage.sizes
      : DEFAULT_SIZES;

  useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(size)) {
      setSize(availableSizes[0]);
    }
  }, [index, availableSizes, size]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, images.length, onClose]);

  if (!isOpen || !collection || !currentImage) return null;

  const pieceTitle =
    currentImage.title || currentImage.caption || `${collection.name} Piece #${index + 1}`;
  const piecePrice =
    typeof currentImage.price === 'number' && currentImage.price > 0
      ? currentImage.price
      : typeof collection.price === 'number' && collection.price > 0
        ? collection.price
        : 55;
  const pieceType = currentImage.garmentType || 'tshirt';
  const pieceColor = currentImage.color || 'Onyx Black';

  const handleAddToCart = () => {
    const item: CartItem = {
      key: `col-${collection.id}-${currentImage.id}-${size}-${Date.now()}`,
      productId: collection.id,
      name: pieceTitle,
      type: pieceType,
      color: pieceColor,
      size,
      qty,
      unit: piecePrice,
      hasDesign: false,
      printed: ['front'] as Side[],
      views: {
        front: { mockup: currentImage.url, design: '' },
        back: { mockup: '', design: '' },
      },
      library: [],
      texts: [],
    };

    addToCart(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#0f0f0f]/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl sm:rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[#ddd6c8] bg-[#f4f1ea] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-anton text-base sm:text-xl uppercase tracking-wider text-[#141414] truncate max-w-[200px] sm:max-w-none">
              {collection.name}
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-[#6b665d] bg-white px-2 sm:px-2.5 py-0.5 rounded-full border border-[#ddd6c8] shrink-0">
              Look {index + 1} / {images.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#141414] hover:bg-[#141414] hover:text-[#f4f1ea] flex items-center justify-center transition-colors shrink-0 ml-2"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left: High-Res Image & Navigation */}
          <div className="lg:col-span-7 bg-[#ebe6dc] relative flex flex-col justify-between p-3 sm:p-5 lg:p-6 select-none min-h-[220px] xs:min-h-[250px] sm:min-h-[340px] lg:min-h-[460px]">
            {/* Prev / Next Arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 text-[#141414] hover:bg-[#141414] hover:text-white flex items-center justify-center shadow-md transition-all active:scale-95 border border-[#ddd6c8]"
                  aria-label="Previous piece"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i + 1) % images.length)}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 text-[#141414] hover:bg-[#141414] hover:text-white flex items-center justify-center shadow-md transition-all active:scale-95 border border-[#ddd6c8]"
                  aria-label="Next piece"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            )}

            {/* Featured Image */}
            <div className="flex-1 flex items-center justify-center py-1 sm:py-2">
              <img
                src={currentImage.url}
                alt={pieceTitle}
                className="max-h-[28vh] xs:max-h-[34vh] sm:max-h-[44vh] lg:max-h-[58vh] h-48 xs:h-56 sm:h-72 lg:h-auto w-auto max-w-full object-contain rounded-xl sm:rounded-2xl shadow-md"
              />
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto justify-start sm:justify-center pt-2 pb-1 max-w-full px-1">
                {images.map((img, i) => (
                  <button
                    key={img.id || i}
                    onClick={() => setIndex(i)}
                    className={`relative w-11 h-12 sm:w-12 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      index === i
                        ? 'border-[#ff4d1c] ring-2 ring-[#ff4d1c]/40 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Details & Purchase Panel */}
          <div className="lg:col-span-5 p-4 sm:p-6 lg:p-8 flex flex-col justify-between space-y-4 sm:space-y-6 bg-[#fffdf8]">
            <div className="space-y-3 sm:space-y-4">
              {/* Product Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#ff4d1c]/10 text-[#ff4d1c] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Official Drop
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b665d] bg-[#ebe6dc] px-2 py-0.5 rounded-full">
                  {pieceType}
                </span>
              </div>

              {/* Title & Price */}
              <div>
                <h2 className="font-anton text-xl sm:text-2xl lg:text-3xl uppercase tracking-wide text-[#141414] leading-tight">
                  {pieceTitle}
                </h2>
                {currentImage.caption && currentImage.caption !== pieceTitle && (
                  <p className="text-xs text-[#6b665d] mt-1 leading-relaxed">
                    {currentImage.caption}
                  </p>
                )}
              </div>

              {/* Price Tag */}
              <div className="flex items-baseline gap-2 pt-1 border-t border-[#ddd6c8]">
                <span className="font-anton text-2xl sm:text-3xl text-[#ff4d1c]">
                  {piecePrice} {currency}
                </span>
                <span className="text-xs text-[#6b665d]">Tax included</span>
              </div>

              {/* Size Selector */}
              <div className="space-y-1.5 sm:space-y-2 pt-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#141414]">
                    Select Size
                  </label>
                  <span className="text-[11px] text-[#6b665d]">Selected: {size}</span>
                </div>

                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {availableSizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`min-w-[40px] sm:min-w-[44px] h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold border transition-all ${
                        size === s
                          ? 'bg-[#141414] text-[#f4f1ea] border-[#141414] shadow-sm ring-2 ring-[#141414]/20'
                          : 'bg-white text-[#141414] border-[#ddd6c8] hover:border-[#141414]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="space-y-1.5 sm:space-y-2 pt-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#141414] block">
                  Quantity
                </label>
                <div className="inline-flex items-center border border-[#141414] rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 sm:px-3.5 py-1 sm:py-1.5 hover:bg-black/5 font-bold text-sm transition-colors"
                  >
                    -
                  </button>
                  <span className="px-3.5 sm:px-4 py-1 sm:py-1.5 font-mono text-xs font-bold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(20, q + 1))}
                    className="px-3 sm:px-3.5 py-1 sm:py-1.5 hover:bg-black/5 font-bold text-sm transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2.5 sm:space-y-3 pt-3 sm:pt-4 border-t border-[#ddd6c8]">
              {justAdded ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full bg-[#2f4a3a] text-white py-3 sm:py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow"
                  >
                    <Check className="w-4 h-4" />
                    <span>Added to Cart!</span>
                  </button>

                  <Link href="/cart" className="block">
                    <button
                      onClick={onClose}
                      className="w-full bg-[#141414] text-[#f4f1ea] hover:bg-[#ff4d1c] py-2.5 sm:py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full bg-[#141414] text-[#f4f1ea] hover:bg-[#ff4d1c] py-3 sm:py-3.5 px-6 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow hover:shadow-lg active:scale-[0.98]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    Buy Piece • {piecePrice * qty} {currency}
                  </span>
                </button>
              )}

              {/* Store Guarantees */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] sm:text-[11px] text-[#6b665d]">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#ff4d1c] shrink-0" />
                  <span>Cash on Delivery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#ff4d1c] shrink-0" />
                  <span>Premium Cotton</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
