'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Layer, Product, Side, TextLayer, ImageLayer } from '@/lib/types';
import { GARMENTS, getProductViewSrc, hasProductPhoto } from '@/lib/garments';
import {
  ensureFont,
  exportDesign,
  exportMockup,
  loadImg,
  readAsDataURL,
  shrinkImage,
} from '@/lib/canvas-utils';
import { newId } from '@/lib/mock-data';
import { CanvasStage } from '@/components/studio/CanvasStage';
import { SideTabs } from '@/components/studio/SideTabs';
import { LayerList } from '@/components/studio/LayerList';
import { LayerControls } from '@/components/studio/LayerControls';
import { DesignGallery } from '@/components/studio/DesignGallery';
import { Lightbox } from '@/components/Lightbox';
import { ArrowLeft, Sparkles, Upload, Type, Minus, Plus } from 'lucide-react';
import Link from 'next/link';

function StudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { products, designs, settings } = useStore();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const initialProdId = searchParams.get('product');
  const initialColor = searchParams.get('color');

  // Selected Product & Options
  const [product, setProduct] = useState<Product | null>(null);
  const [color, setColor] = useState<string>('#ffffff');
  const [size, setSize] = useState<string>('M');
  const [qty, setQty] = useState<number>(1);
  const [side, setSide] = useState<Side>('front');

  // Layers on both sides
  const [layersBySide, setLayersBySide] = useState<Record<Side, Layer[]>>({
    front: [],
    back: [],
  });
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Cached base images & layer images for fast redraw
  const [baseImages, setBaseImages] = useState<Record<Side, HTMLImageElement | null>>({
    front: null,
    back: null,
  });
  const [layerImages, setLayerImages] = useState<Record<string, HTMLImageElement>>({});

  // Input states
  const [textInput, setTextInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Initialize Product
  useEffect(() => {
    if (!products.length) return;
    const found = products.find((p) => p.id === initialProdId) || products[0];
    setProduct(found);
    const chosenColor =
      initialColor && found.colors.includes(initialColor)
        ? initialColor
        : found.colors[0] || '#ffffff';
    setColor(chosenColor);
    setSize(found.sizes[0] || 'M');
  }, [products, initialProdId, initialColor]);

  // Load Base Garment Images when product, color, or side changes
  useEffect(() => {
    if (!product) return;
    let canceled = false;

    const loadBases = async () => {
      const frontSrc = getProductViewSrc(product, color, 'front');
      const backSrc = getProductViewSrc(product, color, 'back');

      try {
        const [frontImg, backImg] = await Promise.all([
          loadImg(frontSrc),
          product.hasBack ? loadImg(backSrc) : Promise.resolve(null),
        ]);
        if (!canceled) {
          setBaseImages({ front: frontImg, back: backImg });
        }
      } catch {
        // Fallback
      }
    };

    loadBases();
    return () => {
      canceled = true;
    };
  }, [product, color]);

  // Lightbox items for full screen inspection - MUST be called unconditionally (Rules of Hooks)
  const lightboxViews = useMemo(() => {
    if (!product) return [];
    const items = [
      {
        src: exportMockup(
          layersBySide.front,
          product.area,
          baseImages.front,
          hasProductPhoto(product, color, 'front'),
          layerImages
        ),
        label: 'Front Custom View',
      },
    ];
    if (product.hasBack) {
      items.push({
        src: exportMockup(
          layersBySide.back,
          product.areaBack,
          baseImages.back,
          hasProductPhoto(product, color, 'back'),
          layerImages
        ),
        label: 'Back Custom View',
      });
    }
    return items;
  }, [layersBySide, product, color, baseImages, layerImages]);

  // Loading state (AFTER all hooks)
  if (!product) {
    return (
      <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-16 text-center text-[#6b665d]">
        Loading customizer studio…
      </div>
    );
  }

  const currentArea = side === 'back' ? product.areaBack : product.area;
  const currentLayers = layersBySide[side];
  const activeBaseImg = baseImages[side];
  const isBasePhoto = hasProductPhoto(product, color, side);

  // Layer Management
  const handleUpdateLayer = (idx: number, updates: Partial<Layer>) => {
    setLayersBySide((prev) => {
      const list = [...prev[side]];
      list[idx] = { ...list[idx], ...updates } as Layer;
      return { ...prev, [side]: list };
    });
  };

  const handleDeleteLayer = (idx: number) => {
    setLayersBySide((prev) => {
      const list = prev[side].filter((_, i) => i !== idx);
      return { ...prev, [side]: list };
    });
    setSelectedIndex(-1);
    toast('Layer removed');
  };

  const handleBringForward = (idx: number) => {
    setLayersBySide((prev) => {
      const list = [...prev[side]];
      if (idx < list.length - 1) {
        const temp = list[idx];
        list[idx] = list[idx + 1];
        list[idx + 1] = temp;
      }
      return { ...prev, [side]: list };
    });
    setSelectedIndex(idx + 1);
  };

  const addImageLayer = async (src: string, name: string, libId?: string) => {
    try {
      const img = await loadImg(src);
      const id = newId();
      const a = currentArea;
      const fit = Math.min((a.w * 0.75) / img.width, (a.h * 0.75) / img.height, 1);

      const newLayer: ImageLayer = {
        id,
        type: 'img',
        src,
        w0: img.width * fit,
        h0: img.height * fit,
        s: 1,
        cx: a.x + a.w / 2,
        cy: a.y + a.h / 2,
        rot: 0,
        name,
        libId: libId || null,
      };

      setLayerImages((prev) => ({ ...prev, [id]: img }));
      setLayersBySide((prev) => ({
        ...prev,
        [side]: [...prev[side], newLayer],
      }));
      setSelectedIndex(currentLayers.length);
      toast(`Added "${name}" to ${side}`);
    } catch {
      toast('Could not load image');
    }
  };

  const handleFileUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      try {
        const optimized = await shrinkImage(f);
        await addImageLayer(optimized, f.name.replace(/\.[^.]+$/, ''));
      } catch {
        toast(`Could not process ${f.name}`);
      }
    }
  };

  const handleAddText = async () => {
    const text = textInput.trim();
    if (!text) return;

    await ensureFont('Anton');
    const id = newId();
    const a = currentArea;

    const newLayer: TextLayer = {
      id,
      type: 'text',
      text,
      font: 'Anton',
      color: '#141414',
      baseSize: 46,
      s: 1,
      cx: a.x + a.w / 2,
      cy: a.y + a.h / 2,
      rot: 0,
    };

    setLayersBySide((prev) => ({
      ...prev,
      [side]: [...prev[side], newLayer],
    }));
    setSelectedIndex(currentLayers.length);
    setTextInput('');
    toast('Text added to canvas');
  };

  // Pricing calculation
  const printedSides: Side[] = [];
  if (layersBySide.front.length > 0) printedSides.push('front');
  if (layersBySide.back.length > 0) printedSides.push('back');

  const unitPrice = product.price + printedSides.length * product.printPrice;
  const totalPrice = unitPrice * qty;

  // Add to cart with export
  const handleAddToCart = async () => {
    setIsExporting(true);

    try {
      const frontMockup = exportMockup(
        layersBySide.front,
        product.area,
        baseImages.front,
        hasProductPhoto(product, color, 'front'),
        layerImages
      );
      const frontDesign = exportDesign(layersBySide.front, product.area, layerImages);

      let backMockup = '';
      let backDesign = '';
      if (product.hasBack) {
        backMockup = exportMockup(
          layersBySide.back,
          product.areaBack,
          baseImages.back,
          hasProductPhoto(product, color, 'back'),
          layerImages
        );
        backDesign = exportDesign(layersBySide.back, product.areaBack, layerImages);
      }

      const allTexts = [
        ...layersBySide.front.filter((l) => l.type === 'text').map((l) => (l as TextLayer).text),
        ...layersBySide.back.filter((l) => l.type === 'text').map((l) => (l as TextLayer).text),
      ];

      const allLibrary = [
        ...layersBySide.front.filter((l) => (l as ImageLayer).libId).map((l) => (l as ImageLayer).name),
        ...layersBySide.back.filter((l) => (l as ImageLayer).libId).map((l) => (l as ImageLayer).name),
      ];

      addToCart({
        key: newId(),
        productId: product.id,
        name: product.name,
        type: product.type,
        color,
        size,
        qty,
        unit: unitPrice,
        hasDesign: printedSides.length > 0,
        printed: printedSides,
        views: {
          front: { mockup: frontMockup, design: frontDesign },
          back: { mockup: backMockup, design: backDesign },
        },
        library: allLibrary,
        texts: allTexts,
      });

      router.push('/cart');
    } catch {
      toast('Could not generate mockups. Try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141414] hover:text-[#ff4d1c] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to collection</span>
        </Link>
      </div>

      {/* Main Studio Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Canvas Stage (Sticky) */}
        <div className="lg:col-span-6 space-y-3">
          <SideTabs
            side={side}
            hasBack={product.hasBack}
            frontLayerCount={layersBySide.front.length}
            backLayerCount={layersBySide.back.length}
            onSideChange={(s) => {
              setSide(s);
              setSelectedIndex(-1);
            }}
          />

          <CanvasStage
            side={side}
            area={currentArea}
            layers={currentLayers}
            selectedIndex={selectedIndex}
            baseImg={activeBaseImg}
            isPhoto={isBasePhoto}
            layerImages={layerImages}
            onSelectLayer={setSelectedIndex}
            onUpdateLayer={handleUpdateLayer}
            onDropFiles={handleFileUpload}
            onZoom={() => setLightboxOpen(true)}
          />
        </div>

        {/* Right: Controls Panel */}
        <div className="lg:col-span-6 space-y-5">
          {/* Header Info */}
          <div>
            <div className="text-xs text-[#6b665d] uppercase font-bold tracking-wider">
              {GARMENTS[product.type]?.label}
              {product.hasBack ? ' · Front & Back Print' : ' · Front Print'}
            </div>
            <h1 className="font-anton text-4xl sm:text-5xl uppercase tracking-wide text-[#141414] leading-tight">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-xs text-[#6b665d] mt-1 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Color Switcher */}
          {product.colors.length > 0 && (
            <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b665d]">
                Garment Color
              </h4>
              <div className="flex gap-2.5 flex-wrap items-center">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border border-black/20 transition-all ${color === c ? 'ring-2 ring-[#141414] ring-offset-2 scale-110' : 'hover:scale-105'
                      }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size Switcher */}
          {product.sizes.length > 0 && (
            <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b665d]">
                Garment Size
              </h4>
              <div className="flex gap-2 flex-wrap">
                {(product.type !== 'tote' && !product.sizes.includes('XXL') && !product.sizes.includes('One Size')
                  ? [...product.sizes, 'XXL']
                  : product.sizes
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      size === s
                        ? 'bg-[#141414] text-[#f4f1ea] border-[#141414]'
                        : 'bg-white text-[#141414] border-[#ddd6c8] hover:border-[#141414]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Design Library Gallery */}
          <DesignGallery
            designs={designs}
            onSelectDesign={(d) => addImageLayer(d.image, d.name, d.id)}
          />

          {/* Custom Artwork & Typography Tools */}
          <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b665d]">
              Add to {side}
            </h4>

            {/* Upload File Input */}
            <div>
              <label className="w-full bg-[#141414] hover:bg-[#ff4d1c] text-[#f4f1ea] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload Custom Image or Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {/* Custom Text Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type custom text to print…"
                maxLength={60}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddText();
                }}
                className="flex-1 px-3 py-2 text-xs bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
              <button
                type="button"
                onClick={handleAddText}
                className="px-4 py-2 bg-transparent hover:bg-[#141414] hover:text-[#f4f1ea] text-[#141414] border-[1.5px] border-[#141414] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Type className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            {/* Layers List on Current Side */}
            <div className="border-t border-[#ddd6c8] pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b665d]">
                Layers ({currentLayers.length})
              </span>
              <LayerList
                layers={currentLayers}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onDelete={handleDeleteLayer}
                onBringForward={handleBringForward}
              />
            </div>

            {/* Controls for Selected Layer */}
            <LayerControls
              layer={currentLayers[selectedIndex] || null}
              area={currentArea}
              onUpdate={(updates) => handleUpdateLayer(selectedIndex, updates)}
            />
          </div>

          {/* Pricing & Checkout Actions */}
          <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 space-y-4 shadow-[4px_4px_0_#141414]">
            <div className="flex justify-between items-baseline">
              <div>
                <div className="text-xs text-[#6b665d]">
                  {printedSides.length > 0
                    ? `Includes print on ${printedSides.length} side${printedSides.length > 1 ? 's' : ''
                    } (+${product.printPrice} ${settings.currency} each)`
                    : `Custom print adds ${product.printPrice} ${settings.currency} per side`}
                </div>
                <div className="font-anton text-3xl sm:text-4xl text-[#141414]">
                  {totalPrice} {settings.currency}
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center border-[1.5px] border-[#141414] rounded-full overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#ebe6dc] transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-sm">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#ebe6dc] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleAddToCart}
              className="w-full bg-[#141414] hover:bg-[#ff4d1c] disabled:opacity-50 text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isExporting ? 'Generating print files…' : 'Add to cart'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Fullscreen Mockup */}
      <Lightbox
        isOpen={lightboxOpen}
        items={lightboxViews}
        title={`${product.name} — Customized Preview`}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-16 text-center text-[#6b665d]">
          Loading customizer studio…
        </div>
      }
    >
      <StudioContent />
    </Suspense>
  );
}
