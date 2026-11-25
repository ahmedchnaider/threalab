'use client';

import React, { useState } from 'react';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/shop/ProductCard';
import { Lightbox } from '@/components/Lightbox';
import { CollectionModal } from '@/components/shop/CollectionModal';
import { LightboxItem, Product, Collection } from '@/lib/types';
import { getProductViewSrc } from '@/lib/garments';
import Link from 'next/link';
import { Sparkles, Layers, ShoppingBag } from 'lucide-react';

export default function ShopPage() {
  const { products, collections, settings, isLoading } = useStore();
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Collection modal state
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionModalIndex, setCollectionModalIndex] = useState(0);

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

  // Open collection product purchase modal
  const handleOpenCollection = (collection: Collection, index = 0) => {
    setSelectedCollection(collection);
    setCollectionModalIndex(index);
    setCollectionModalOpen(true);
  };

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

      {/* Lookbook / Collections Showcase - Under Garments & Blanks */}
      {activeCollections.length > 0 && (
        <section className="space-y-6">
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
          </div>

          {/* Grid of collections, each showcased with one front image */}
          <div
            className={`grid gap-6 ${
              activeCollections.length === 1
                ? 'grid-cols-1'
                : activeCollections.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {activeCollections.map((col) => {
              const frontImage = col.coverImage || col.images?.[0]?.url || '';
              const prices = col.images.map((img) => img.price).filter((p): p is number => typeof p === 'number' && p > 0);
              const minPrice = prices.length > 0 ? Math.min(...prices) : (col.price || 45);

              return (
                <div
                  key={col.id}
                  onClick={() => handleOpenCollection(col, 0)}
                  className="group relative bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  {/* Single Front Image */}
                  <div
                    className={`relative w-full overflow-hidden bg-[#ebe6dc] ${
                      activeCollections.length === 1
                        ? 'aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9] min-h-[380px] sm:min-h-0'
                        : 'aspect-[4/5]'
                    }`}
                  >
                    {frontImage ? (
                      <img
                        src={frontImage}
                        alt={col.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#6b665d]">
                        <span>No image</span>
                      </div>
                    )}

                    {/* Gradient Overlay with Collection Info & Shop Action */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10 flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-white">
                      {/* Top Badges */}
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] sm:text-[11px] font-bold font-mono px-2.5 sm:px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center gap-1.5 shadow">
                          <Layers className="w-3.5 h-3.5 text-[#ff4d1c]" />
                          <span>
                            {col.images.length}{' '}
                            {col.images.length === 1 ? 'piece' : 'pieces'}
                          </span>
                        </span>

                        <span className="text-[11px] sm:text-xs font-bold font-mono px-2.5 sm:px-3 py-1 rounded-full bg-[#141414]/80 backdrop-blur-md text-[#f4f1ea] border border-white/20 flex items-center gap-1 shadow">
                          <span>From {minPrice} {settings.currency}</span>
                        </span>
                      </div>

                      {/* Bottom Title, Description & Shop Button */}
                      <div className="space-y-2 sm:space-y-3">
                        <div className="inline-block">
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-[#ff4d1c] bg-black/60 px-2 py-0.5 rounded">
                            Official Collection
                          </span>
                        </div>
                        <h3 className="font-anton text-xl sm:text-3xl lg:text-4xl uppercase tracking-wide text-[#f4f1ea] drop-shadow-sm leading-tight">
                          {col.name}
                        </h3>
                        {col.description && (
                          <p className="text-xs sm:text-sm text-[#f4f1ea]/85 line-clamp-2 max-w-xl leading-relaxed">
                            {col.description}
                          </p>
                        )}
                        <div className="pt-1 sm:pt-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#ff4d1c] text-white font-bold text-xs uppercase tracking-wider shadow hover:bg-white hover:text-[#141414] transition-all group-hover:scale-105 active:scale-95"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Shop Collection Pieces</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Collection Purchase & Lookbook Modal */}
      <CollectionModal
        collection={selectedCollection}
        currency={settings.currency}
        isOpen={collectionModalOpen}
        initialIndex={collectionModalIndex}
        onClose={() => setCollectionModalOpen(false)}
      />

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
