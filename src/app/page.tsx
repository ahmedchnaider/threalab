'use client';

import React, { useState } from 'react';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/shop/ProductCard';
import { Lightbox } from '@/components/Lightbox';
import { LightboxItem, Product } from '@/lib/types';
import { getProductViewSrc } from '@/lib/garments';
import Link from 'next/link';

export default function ShopPage() {
  const { products, settings, isLoading } = useStore();
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeProducts = products
    .filter((p) => p.active)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const handleZoom = (product: Product, color: string) => {
    const items: LightboxItem[] = [
      {
        src: getProductViewSrc(product, color, 'front'),
        label: 'Front View',
      },
    ];

    if (product.hasBack) {
      items.push({
        src: getProductViewSrc(product, color, 'back'),
        label: 'Back View',
      });
    }

    setLightboxItems(items);
    setLightboxTitle(product.name);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end pb-8 border-b-[1.5px] border-[#141414]">
        <div className="md:col-span-7 space-y-4">
          <h1 className="font-anton text-5xl sm:text-7xl lg:text-8xl leading-[0.92] uppercase text-[#141414]">
            Wear your
            <br />
            <span className="text-[#ff4d1c]">own</span> design.
          </h1>
        </div>

        <div className="md:col-span-5 space-y-4">
          <p className="text-base sm:text-lg text-[#141414] leading-relaxed">
            {settings.tagline ||
              'Pick a piece, drop in your artwork or words, and we print it just for you.'}
          </p>

          <div className="flex gap-4 sm:gap-6 pt-2 text-xs sm:text-sm text-[#6b665d] border-t border-[#ddd6c8]">
            <div className="flex items-center gap-1.5">
              <span className="font-anton text-base text-[#141414]">1</span>
              <span>Choose piece</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-anton text-base text-[#141414]">2</span>
              <span>Design on canvas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-anton text-base text-[#141414]">3</span>
              <span>We print & ship</span>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="space-y-6">
        <div className="flex justify-between items-baseline">
          <h2 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-[#141414]">
            Collection ({activeProducts.length})
          </h2>
          <Link
            href="/studio"
            className="text-xs font-bold text-[#ff4d1c] hover:underline"
          >
            Open blank studio →
          </Link>
        </div>

        {isLoading ? (
          <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-16 text-center text-[#6b665d]">
            Loading the collection…
          </div>
        ) : activeProducts.length === 0 ? (
          <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-16 text-center space-y-4 text-[#6b665d]">
            <p>No products available yet.</p>
            <Link
              href="/admin"
              className="inline-block bg-[#141414] text-[#f4f1ea] px-6 py-2.5 rounded-full text-xs font-bold"
            >
              Add your first product in Admin
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                currency={settings.currency}
                onZoom={handleZoom}
              />
            ))}
          </div>
        )}
      </section>

      {/* Fullscreen Lightbox Modal */}
      <Lightbox
        isOpen={lightboxOpen}
        items={lightboxItems}
        title={lightboxTitle}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
