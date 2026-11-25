'use client';

import React, { useState } from 'react';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/shop/ProductCard';
import { Lightbox } from '@/components/Lightbox';
import { LightboxItem, Product, Collection } from '@/lib/types';
import { getProductViewSrc } from '@/lib/garments';
import Link from 'next/link';
import { Maximize2, Sparkles, Layers } from 'lucide-react';

export default function ShopPage() {
  const { products, collections, settings, isLoading } = useStore();
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Selected collection tab for lookbook
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');

  const activeProducts = products
    .filter((p) => p.active)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const activeCollections = (collections || [])
    .filter((c) => c.active && c.images && c.images.length > 0)
    .sort((a, b) => a.order - b.order || b.createdAt - a.createdAt);

  // Product zoom handler
  const handleProductZoom = (product: Product, color: string) => {
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
    setLightboxIndex(0);
    setLightboxTitle(product.name);
    setLightboxOpen(true);
  };

  // Collection photo zoom handler
  const handleCollectionImageZoom = (collection: Collection, index: number) => {
    const items: LightboxItem[] = collection.images.map((img, i) => ({
      src: img.url,
      label: img.caption || `${collection.name} - Look #${i + 1}`,
    }));

    setLightboxItems(items);
    setLightboxIndex(index);
    setLightboxTitle(collection.name);
    setLightboxOpen(true);
  };

  const displayedCollections =
    selectedCollectionId === 'all'
      ? activeCollections
      : activeCollections.filter((c) => c.id === selectedCollectionId);

  return (
    <div className="space-y-16">
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

      {/* Lookbook / Collections Showcase */}
      {activeCollections.length > 0 && (
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#ddd6c8]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#ff4d1c] bg-[#ff4d1c]/10 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Lookbook & Releases
                </span>
              </div>
              <h2 className="font-anton text-3xl sm:text-4xl uppercase tracking-wide text-[#141414]">
                Collections ({activeCollections.length})
              </h2>
            </div>

            {/* Collection Filter Tabs if multiple collections */}
            {activeCollections.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedCollectionId('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    selectedCollectionId === 'all'
                      ? 'bg-[#141414] text-[#f4f1ea]'
                      : 'bg-[#ebe6dc] text-[#141414] hover:bg-[#ddd6c8]'
                  }`}
                >
                  All Releases
                </button>
                {activeCollections.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedCollectionId(col.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                      selectedCollectionId === col.id
                        ? 'bg-[#141414] text-[#f4f1ea]'
                        : 'bg-[#ebe6dc] text-[#141414] hover:bg-[#ddd6c8]'
                    }`}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Render Collections */}
          <div className="space-y-12">
            {displayedCollections.map((col) => (
              <div
                key={col.id}
                className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm"
              >
                {/* Collection Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ddd6c8]">
                  <div>
                    <h3 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-[#141414]">
                      {col.name}
                    </h3>
                    {col.description && (
                      <p className="text-sm text-[#6b665d] mt-1 max-w-2xl leading-relaxed">
                        {col.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-[#ebe6dc] text-[#141414] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#ff4d1c]" />
                      <span>{col.images.length} photos</span>
                    </span>
                  </div>
                </div>

                {/* Collection Image Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {col.images.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      onClick={() => handleCollectionImageZoom(col, idx)}
                      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#ebe6dc] border border-[#141414]/15 cursor-pointer shadow-sm hover:shadow-md transition-all"
                    >
                      <img
                        src={img.url}
                        alt={img.caption || `${col.name} photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white">
                        <div className="self-end">
                          <span className="p-2 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors">
                            <Maximize2 className="w-4 h-4" />
                          </span>
                        </div>
                        <div className="space-y-1">
                          {img.caption && (
                            <p className="text-xs font-semibold line-clamp-2 text-[#f4f1ea]">
                              {img.caption}
                            </p>
                          )}
                          <span className="text-[10px] text-white/70 uppercase tracking-wider font-mono">
                            Look {idx + 1} of {col.images.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Blanks & Garments Catalog Grid */}
      <section className="space-y-6">
        <div className="flex justify-between items-baseline pb-2 border-b border-[#ddd6c8]">
          <div>
            <h2 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-[#141414]">
              Garments & Blanks ({activeProducts.length})
            </h2>
            <p className="text-xs text-[#6b665d]">
              Choose a blank piece to customize in our Studio with your artwork and typography.
            </p>
          </div>
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
                onZoom={handleProductZoom}
              />
            ))}
          </div>
        )}
      </section>

      {/* Fullscreen Lightbox Modal */}
      <Lightbox
        isOpen={lightboxOpen}
        items={lightboxItems}
        initialIndex={lightboxIndex}
        title={lightboxTitle}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
