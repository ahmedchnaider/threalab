'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GarmentType, PrintArea, Product, Side } from '@/lib/types';
import {
  defaultArea,
  GARMENTS,
  getProductViewSrc,
  hasProductPhoto,
  cpKey,
  svgURL,
} from '@/lib/garments';
import { drawBase, loadImg, readAsDataURL } from '@/lib/canvas-utils';
import { newId } from '@/lib/mock-data';
import {
  Trash2,
  Edit3,
  Plus,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Eye,
  Layers,
} from 'lucide-react';

const PALETTE = [
  '#ffffff',
  '#141414',
  '#e9e4d8',
  '#c8b89a',
  '#7d8b6a',
  '#2f4a3a',
  '#1f2f52',
  '#9aa5b1',
  '#8a1c1c',
  '#ff4d1c',
  '#f2c94c',
  '#e8a7b8',
];

const COLOR_NAMES: Record<string, string> = {
  '#ffffff': 'Pure White',
  '#141414': 'Onyx Black',
  '#e9e4d8': 'Natural Sand',
  '#c8b89a': 'Khaki Beige',
  '#7d8b6a': 'Sage Olive',
  '#2f4a3a': 'Forest Pine',
  '#1f2f52': 'Navy Blue',
  '#9aa5b1': 'Slate Grey',
  '#8a1c1c': 'Crimson Red',
  '#ff4d1c': 'Flame Orange',
  '#f2c94c': 'Mustard Yellow',
  '#e8a7b8': 'Dusty Rose',
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

function createEmptyProduct(order: number): Product {
  return {
    id: '',
    name: '',
    type: 'tshirt',
    price: 45,
    printPrice: 15,
    colors: ['#ffffff', '#141414'],
    sizes: ['S', 'M', 'L', 'XL'],
    description: '',
    photo: '',
    photoBack: '',
    hasBack: true,
    colorPhotos: {},
    area: defaultArea('tshirt', 'front', false),
    areaBack: defaultArea('tshirt', 'back', false),
    active: true,
    order,
  };
}

interface ProductsManagerProps {
  products: Product[];
  currency: string;
  onSave: (product: Product) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ProductsManager({ products, currency, onSave, onDelete }: ProductsManagerProps) {
  const [editing, setEditing] = useState<Product>(() => createEmptyProduct(products.length));

  const [activeSide, setActiveSide] = useState<Side>('front');
  const [activeColor, setActiveColor] = useState<string>('');
  const [baseImg, setBaseImg] = useState<HTMLImageElement | null>(null);
  const [isPhoto, setIsPhoto] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    mode: 'move' | 'scale';
    p0: { x: number; y: number };
    area0: PrintArea;
  } | null>(null);

  const currentArea = activeSide === 'back' ? editing.areaBack : editing.area;

  const setArea = (newArea: PrintArea) => {
    if (activeSide === 'back') {
      setEditing((prev) => ({ ...prev, areaBack: newArea }));
    } else {
      setEditing((prev) => ({ ...prev, area: newArea }));
    }
  };

  // Keep activeColor valid
  const currentPreviewColor =
    activeColor && editing.colors.includes(activeColor)
      ? activeColor
      : editing.colors[0] || '#ffffff';

  // Load preview base image for canvas whenever editing state, preview color, or side changes
  useEffect(() => {
    let canceled = false;
    const src = getProductViewSrc(editing, currentPreviewColor, activeSide);
    const hasPhoto = hasProductPhoto(editing, currentPreviewColor, activeSide);

    loadImg(src)
      .then((img) => {
        if (!canceled) {
          setBaseImg(img);
          setIsPhoto(hasPhoto);
        }
      })
      .catch(() => {});

    return () => {
      canceled = true;
    };
  }, [editing, currentPreviewColor, activeSide]);

  // Redraw canvas
  const drawEditor = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 600, 700);
    drawBase(ctx, baseImg, isPhoto);

    // Bounding Box
    const a = currentArea;
    ctx.fillStyle = 'rgba(255, 77, 28, 0.15)';
    ctx.fillRect(a.x, a.y, a.w, a.h);

    ctx.setLineDash([10, 7]);
    ctx.strokeStyle = '#ff4d1c';
    ctx.lineWidth = 3;
    ctx.strokeRect(a.x, a.y, a.w, a.h);
    ctx.setLineDash([]);

    // Bottom-right handle
    ctx.beginPath();
    ctx.arc(a.x + a.w, a.y + a.h, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff4d1c';
    ctx.font = '700 18px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${activeSide.toUpperCase()} PRINT AREA`, a.x + a.w / 2, a.y + a.h / 2);
  }, [baseImg, isPhoto, currentArea, activeSide]);

  useEffect(() => {
    drawEditor();
  }, [drawEditor]);

  // Pointer interactions for the print box
  const getCanvasPt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * 600) / r.width,
      y: ((e.clientY - r.top) * 700) / r.height,
    };
  };

  const isOverHandle = (p: { x: number; y: number }) => {
    const a = currentArea;
    return Math.hypot(p.x - a.x - a.w, p.y - a.y - a.h) < 30;
  };

  const isInsideBox = (p: { x: number; y: number }) => {
    const a = currentArea;
    return p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getCanvasPt(e);
    const mode = isOverHandle(p) ? 'scale' : isInsideBox(p) ? 'move' : null;
    if (!mode) return;

    dragRef.current = {
      mode,
      p0: p,
      area0: { ...currentArea },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getCanvasPt(e);
    const drag = dragRef.current;

    if (!drag) {
      if (isOverHandle(p)) {
        e.currentTarget.style.cursor = 'nwse-resize';
      } else if (isInsideBox(p)) {
        e.currentTarget.style.cursor = 'move';
      } else {
        e.currentTarget.style.cursor = 'default';
      }
      return;
    }

    const dx = p.x - drag.p0.x;
    const dy = p.y - drag.p0.y;
    const a0 = drag.area0;

    if (drag.mode === 'move') {
      const newX = Math.max(0, Math.min(600 - a0.w, a0.x + dx));
      const newY = Math.max(0, Math.min(700 - a0.h, a0.y + dy));
      setArea({ ...a0, x: Math.round(newX), y: Math.round(newY) });
    } else {
      const newW = Math.max(40, Math.min(600 - a0.x, a0.w + dx));
      const newH = Math.max(40, Math.min(700 - a0.y, a0.h + dy));
      setArea({ ...a0, w: Math.round(newW), h: Math.round(newH) });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Upload color-specific photo (front or back for a particular color)
  const handleColorPhotoUpload = async (
    color: string,
    side: Side,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readAsDataURL(file);
    const key = cpKey(color, side);
    setEditing((prev) => {
      const nextPhotos = {
        ...(prev.colorPhotos || {}),
        [key]: dataUrl,
      };
      const isFirst = prev.colors[0] === color;
      return {
        ...prev,
        photo: side === 'front' && (isFirst || !prev.photo) ? dataUrl : prev.photo,
        photoBack: side === 'back' && (isFirst || !prev.photoBack) ? dataUrl : prev.photoBack,
        colorPhotos: nextPhotos,
      };
    });
    setActiveColor(color);
    setActiveSide(side);
    e.target.value = '';
  };

  const handleRemoveColorPhoto = (color: string, side: Side) => {
    const key = cpKey(color, side);
    setEditing((prev) => {
      const next = { ...(prev.colorPhotos || {}) };
      delete next[key];
      const isFirst = prev.colors[0] === color;
      let nextPhoto = prev.photo;
      let nextPhotoBack = prev.photoBack;
      if (side === 'front' && isFirst) {
        const remaining = Object.entries(next).find(([k]) => k.endsWith('-front'));
        nextPhoto = remaining ? remaining[1] : '';
      }
      if (side === 'back' && isFirst) {
        const remaining = Object.entries(next).find(([k]) => k.endsWith('-back'));
        nextPhotoBack = remaining ? remaining[1] : '';
      }
      return {
        ...prev,
        photo: nextPhoto,
        photoBack: nextPhotoBack,
        colorPhotos: next,
      };
    });
  };

  const handleResetArea = () => {
    const hasPh = hasProductPhoto(editing, currentPreviewColor, activeSide);
    setArea(defaultArea(editing.type, activeSide, hasPh));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing.colors.length) {
      alert('Select at least one color');
      return;
    }
    setIsSaving(true);
    try {
      const id = editing.id || newId();
      await onSave({
        ...editing,
        id,
        colorPhotos: editing.colorPhotos || {},
      });
      setEditing(createEmptyProduct(products.length));
    } finally {
      setIsSaving(false);
    }
  };

  const colorPhotosCount = Object.keys(editing.colorPhotos || {}).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Product Form on Left */}
      <div className="lg:col-span-7 bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-[#ddd6c8]">
          <div>
            <h4 className="font-anton text-2xl tracking-wide uppercase text-[#141414]">
              {editing.id ? 'Edit Product' : 'Add New Product'}
            </h4>
            <p className="text-xs text-[#6b665d] mt-0.5">
              Upload garment photos, define colors, and customize print boundaries.
            </p>
          </div>
          {editing.id && (
            <button
              type="button"
              onClick={() => {
                setEditing(createEmptyProduct(products.length));
                setActiveColor('');
                setActiveSide('front');
              }}
              className="text-xs font-bold text-[#ff4d1c] hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff4d1c]/30 hover:border-[#ff4d1c]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6 text-sm">
          {/* 1. Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                maxLength={80}
                placeholder="e.g. Classic Heavyweight Street Tee"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                  Garment Type
                </label>
                <select
                  value={editing.type}
                  onChange={(e) => {
                    const t = e.target.value as GarmentType;
                    setEditing({
                      ...editing,
                      type: t,
                      area: defaultArea(t, 'front', Boolean(editing.photo)),
                      areaBack: defaultArea(t, 'back', Boolean(editing.photoBack)),
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c] text-sm"
                >
                  {Object.entries(GARMENTS).map(([k, g]) => (
                    <option key={k} value={k}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                  Base Price ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                  Print Fee / Side ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editing.printPrice}
                  onChange={(e) => setEditing({ ...editing, printPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c] text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={editing.hasBack}
                onChange={(e) => setEditing({ ...editing, hasBack: e.target.checked })}
                className="accent-[#ff4d1c] w-4 h-4 rounded"
              />
              <span className="text-xs font-medium text-[#141414]">
                Enable 2-Sided Customization (Front & Back printing)
              </span>
            </label>
          </div>

          {/* 2. Available Colors & Color-Specific Uploads */}
          <div className="border-[1.5px] border-[#141414] rounded-xl p-4 bg-white space-y-4">
            <div className="flex justify-between items-baseline">
              <h5 className="font-anton text-base tracking-wide uppercase text-[#141414] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ff4d1c]" />
                <span>Colors & Garment Photos</span>
              </h5>
              <span className="text-[11px] font-bold text-[#ff4d1c]">
                {editing.colors.length} selected · {colorPhotosCount} custom photo{colorPhotosCount === 1 ? '' : 's'}
              </span>
            </div>

            <p className="text-xs text-[#6b665d]">
              Upload front and back photos for each color variation. If a color doesn&apos;t have uploaded photos, it will automatically use the dynamic vector preview.
            </p>

            {/* Palette Multi-select */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-2">
                Select Available Palette:
              </span>
              <div className="flex gap-2 flex-wrap items-center">
                {PALETTE.map((c) => {
                  const isSelected = editing.colors.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const updated = isSelected
                          ? editing.colors.filter((x) => x !== c)
                          : [...editing.colors, c];
                        setEditing({ ...editing, colors: updated });
                        if (isSelected && activeColor === c) {
                          setActiveColor(updated[0] || '');
                        }
                      }}
                      className={`w-7 h-7 rounded-full border border-black/25 transition-all relative ${
                        isSelected ? 'ring-2 ring-[#ff4d1c] ring-offset-2 scale-110 shadow-sm' : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={`${COLOR_NAMES[c] || c} (${isSelected ? 'Selected' : 'Click to add'})`}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 absolute inset-0 m-auto ${
                            c === '#ffffff' || c === '#e9e4d8' || c === '#f2c94c' || c === '#e8a7b8'
                              ? 'text-[#141414]'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of Selected Colors with Upload Slots */}
            <div className="space-y-3 pt-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#6b665d]">
                Upload Dedicated Images for Each Color:
              </span>

              {editing.colors.length === 0 ? (
                <p className="text-xs text-[#b3261e] italic">Please select at least one color above.</p>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {editing.colors.map((c) => {
                    const frontKey = cpKey(c, 'front');
                    const backKey = cpKey(c, 'back');
                    const frontImg = editing.colorPhotos?.[frontKey];
                    const backImg = editing.colorPhotos?.[backKey];
                    const isActive = currentPreviewColor === c;

                    return (
                      <div
                        key={c}
                        className={`border rounded-xl p-3 transition-all ${
                          isActive
                            ? 'border-[#ff4d1c] bg-[#fffaf5] shadow-xs'
                            : 'border-[#ddd6c8] bg-[#faf8f4] hover:border-[#aaa]'
                        }`}
                      >
                        {/* Header for this color swatch */}
                        <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-[#ece7de]">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full border border-black/25 shrink-0"
                              style={{ backgroundColor: c }}
                            />
                            <span className="font-bold text-xs text-[#141414]">
                              {COLOR_NAMES[c] || c}
                            </span>
                            <span className="text-[10px] text-[#6b665d] uppercase">({c})</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveColor(c)}
                            className={`text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-colors ${
                              isActive
                                ? 'bg-[#ff4d1c] text-white'
                                : 'bg-white border border-[#ddd6c8] text-[#141414] hover:bg-[#141414] hover:text-white'
                            }`}
                            title="Preview this color in the interactive canvas"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isActive ? 'Previewing' : 'Preview'}</span>
                          </button>
                        </div>

                        {/* Upload Slots for Front and Back of this color */}
                        <div className={`grid grid-cols-1 ${editing.hasBack ? 'sm:grid-cols-2' : ''} gap-2.5`}>
                          {/* Front Slot for this Color */}
                          <div className="border border-[#e2dcd2] rounded-lg p-2 bg-white flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {frontImg ? (
                                <img
                                  src={frontImg}
                                  alt=""
                                  className="w-10 h-10 object-contain rounded bg-[#faf8f4] border border-[#ddd6c8] shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-[#ebe6dc] border border-[#ddd6c8] flex items-center justify-center shrink-0 text-[#8a8479]">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-[#141414] truncate">
                                  Front View
                                </div>
                                <div className="text-[10px] text-[#6b665d]">
                                  {frontImg ? (
                                    <span className="text-green-700 font-semibold flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5" /> Photo uploaded
                                    </span>
                                  ) : (
                                    <span>Vector SVG preview</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <label className="cursor-pointer bg-[#faf8f4] hover:bg-[#141414] text-[#141414] hover:text-white border border-[#ddd6c8] px-2 py-1 rounded text-[11px] font-bold transition-colors">
                                <span>{frontImg ? 'Change' : 'Upload'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => handleColorPhotoUpload(c, 'front', e)}
                                />
                              </label>
                              {frontImg && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveColorPhoto(c, 'front')}
                                  className="p-1 text-[#b3261e] hover:bg-red-50 rounded"
                                  title="Remove custom front photo for this color"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Back Slot for this Color */}
                          {editing.hasBack && (
                            <div className="border border-[#e2dcd2] rounded-lg p-2 bg-white flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {backImg ? (
                                  <img
                                    src={backImg}
                                    alt=""
                                    className="w-10 h-10 object-contain rounded bg-[#faf8f4] border border-[#ddd6c8] shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-[#ebe6dc] border border-[#ddd6c8] flex items-center justify-center shrink-0 text-[#8a8479]">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-[#141414] truncate">
                                    Back View
                                  </div>
                                  <div className="text-[10px] text-[#6b665d]">
                                    {backImg ? (
                                      <span className="text-green-700 font-semibold flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5" /> Photo uploaded
                                      </span>
                                    ) : (
                                      <span>Vector SVG preview</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <label className="cursor-pointer bg-[#faf8f4] hover:bg-[#141414] text-[#141414] hover:text-white border border-[#ddd6c8] px-2 py-1 rounded text-[11px] font-bold transition-colors">
                                  <span>{backImg ? 'Change' : 'Upload'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={(e) => handleColorPhotoUpload(c, 'back', e)}
                                  />
                                </label>
                                {backImg && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColorPhoto(c, 'back')}
                                    className="p-1 text-[#b3261e] hover:bg-red-50 rounded"
                                    title="Remove custom back photo for this color"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 4. Interactive Print Area Editor Canvas */}
          <div className="border-[1.5px] border-[#ddd6c8] rounded-xl p-4 bg-white space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6b665d] block">
                  Print Area Positioning & Preview
                </span>
                <span className="text-[11px] text-[#8a8479]">
                  Previewing: <strong className="text-[#141414]">{COLOR_NAMES[currentPreviewColor] || currentPreviewColor}</strong> ({activeSide})
                </span>
              </div>

              {/* Side toggle */}
              <div className="flex gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => setActiveSide('front')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    activeSide === 'front'
                      ? 'bg-[#141414] text-white border-[#141414]'
                      : 'bg-[#ebe6dc] text-[#141414] border-transparent'
                  }`}
                >
                  Front
                </button>
                {editing.hasBack && (
                  <button
                    type="button"
                    onClick={() => setActiveSide('back')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      activeSide === 'back'
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-[#ebe6dc] text-[#141414] border-transparent'
                    }`}
                  >
                    Back
                  </button>
                )}
              </div>
            </div>

            {/* Color Swatch Quick Selector on Canvas */}
            {editing.colors.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-[10px] uppercase font-bold text-[#8a8479] shrink-0 mr-1">
                  Preview Color:
                </span>
                {editing.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveColor(c)}
                    className={`w-5 h-5 rounded-full border border-black/25 shrink-0 transition-transform ${
                      currentPreviewColor === c ? 'ring-2 ring-[#ff4d1c] ring-offset-1 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    title={COLOR_NAMES[c] || c}
                  />
                ))}
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={600}
              height={700}
              className="w-full max-w-[280px] mx-auto aspect-[6/7] block rounded-lg bg-[#ebe6dc] touch-none select-none border border-[#ddd6c8]"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />

            <div className="text-center text-[11px] text-[#6b665d]">
              Drag orange box to position · Pull corner circle to resize
            </div>

            {/* Exact Numeric Dimensions */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-[#6b665d]">X</label>
                <input
                  type="number"
                  value={currentArea.x}
                  onChange={(e) => setArea({ ...currentArea, x: Number(e.target.value) })}
                  className="w-full p-1.5 border border-[#ddd6c8] rounded text-center"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-[#6b665d]">Y</label>
                <input
                  type="number"
                  value={currentArea.y}
                  onChange={(e) => setArea({ ...currentArea, y: Number(e.target.value) })}
                  className="w-full p-1.5 border border-[#ddd6c8] rounded text-center"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-[#6b665d]">Width</label>
                <input
                  type="number"
                  value={currentArea.w}
                  onChange={(e) => setArea({ ...currentArea, w: Number(e.target.value) })}
                  className="w-full p-1.5 border border-[#ddd6c8] rounded text-center"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-[#6b665d]">Height</label>
                <input
                  type="number"
                  value={currentArea.h}
                  onChange={(e) => setArea({ ...currentArea, h: Number(e.target.value) })}
                  className="w-full p-1.5 border border-[#ddd6c8] rounded text-center"
                />
              </div>
            </div>

            <div className="flex justify-end items-center pt-2">
              <button
                type="button"
                onClick={handleResetArea}
                className="text-xs text-[#6b665d] hover:text-black flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset box to default</span>
              </button>
            </div>
          </div>

          {/* 5. Sizes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1.5">
              Available Sizes
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {SIZES.map((s) => {
                const isSelected = editing.sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? editing.sizes.filter((x) => x !== s)
                        : [...editing.sizes, s];
                      setEditing({ ...editing, sizes: updated });
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-white text-[#141414] border-[#ddd6c8]'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              maxLength={600}
              placeholder="Garment details, fabric GSM, cut & fit instructions..."
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c] text-sm"
            />
          </div>

          {/* 7. Catalog Visibility */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              className="accent-[#ff4d1c] w-4 h-4 rounded"
            />
            <span className="text-xs font-medium text-[#141414]">Visible in store catalog</span>
          </label>

          {/* 8. Save Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#141414] hover:bg-[#ff4d1c] text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3 rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving Product...</span>
            ) : (
              <span>{editing.id ? 'Save Changes' : 'Create Product'}</span>
            )}
          </button>
        </form>
      </div>

      {/* Product List on Right */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex justify-between items-baseline">
          <h4 className="font-anton text-lg tracking-wide uppercase text-[#141414]">
            Products ({products.length})
          </h4>
          <span className="text-xs text-[#6b665d]">Click edit to modify</span>
        </div>

        <div className="space-y-3">
          {products.map((p) => {
            const thumb = getProductViewSrc(p, p.colors[0], 'front');
            const garment = GARMENTS[p.type] || GARMENTS.tshirt;
            const customPhotosCount = Object.keys(p.colorPhotos || {}).length;

            return (
              <div
                key={p.id}
                className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-xl p-3 flex items-center gap-3 transition-shadow hover:shadow-sm"
              >
                <img
                  src={thumb}
                  alt=""
                  className="w-14 h-16 object-contain bg-[#ebe6dc] rounded-lg p-1 border border-[#ddd6c8] shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-sm text-[#141414] truncate">
                    {p.name}
                    {!p.active && <span className="text-xs text-[#b3261e] ml-1.5">(Hidden)</span>}
                  </h5>
                  <div className="text-xs text-[#6b665d] truncate">
                    {garment.label} · {p.price} {currency} · {p.hasBack ? 'Front & Back' : 'Front'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {p.colors.slice(0, 5).map((c) => (
                        <span
                          key={c}
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      {p.colors.length > 5 && (
                        <span className="text-[10px] text-[#6b665d]">+{p.colors.length - 5}</span>
                      )}
                    </div>
                    {customPhotosCount > 0 && (
                      <span className="text-[10px] font-bold text-[#ff4d1c] bg-[#fff0ea] px-1.5 py-0.5 rounded">
                        {customPhotosCount} color photo{customPhotosCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditing({
                        ...p,
                        colorPhotos: p.colorPhotos || {},
                      });
                      setActiveColor(p.colors[0] || '');
                      setActiveSide('front');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-1.5 rounded-lg border border-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirmDeleteId === p.id) {
                        onDelete(p.id);
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(p.id);
                        setTimeout(() => setConfirmDeleteId(null), 3500);
                      }
                    }}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      confirmDeleteId === p.id
                        ? 'bg-[#b3261e] text-white border-[#b3261e]'
                        : 'border-[#b3261e] text-[#b3261e] hover:bg-[#b3261e] hover:text-white'
                    }`}
                    title={confirmDeleteId === p.id ? 'Click to confirm delete' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
