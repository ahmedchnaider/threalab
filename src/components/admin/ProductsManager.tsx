'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GarmentType, PrintArea, Product, Side } from '@/lib/types';
import { defaultArea, GARMENTS, svgURL } from '@/lib/garments';
import { drawBase, loadImg, readAsDataURL } from '@/lib/canvas-utils';
import { newId } from '@/lib/mock-data';
import { Trash2, Edit3, Plus, RotateCcw } from 'lucide-react';

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
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

interface ProductsManagerProps {
  products: Product[];
  currency: string;
  onSave: (product: Product) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ProductsManager({ products, currency, onSave, onDelete }: ProductsManagerProps) {
  const [editing, setEditing] = useState<Product>(() => ({
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
    area: defaultArea('tshirt', 'front', false),
    areaBack: defaultArea('tshirt', 'back', false),
    active: true,
    order: products.length,
  }));

  const [activeSide, setActiveSide] = useState<Side>('front');
  const [activeColor, setActiveColor] = useState<string>('');
  const [baseImg, setBaseImg] = useState<HTMLImageElement | null>(null);
  const [isPhoto, setIsPhoto] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  // Load preview base image
  useEffect(() => {
    let canceled = false;
    const color = activeColor || editing.colors[0] || '#ffffff';
    const photo = activeSide === 'back' ? editing.photoBack : editing.photo;

    if (photo) {
      loadImg(photo)
        .then((img) => {
          if (!canceled) {
            setBaseImg(img);
            setIsPhoto(true);
          }
        })
        .catch(() => {});
    } else {
      const svg = svgURL(editing.type, color, activeSide);
      loadImg(svg)
        .then((img) => {
          if (!canceled) {
            setBaseImg(img);
            setIsPhoto(false);
          }
        })
        .catch(() => {});
    }

    return () => {
      canceled = true;
    };
  }, [editing.type, editing.colors, editing.photo, editing.photoBack, activeColor, activeSide]);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readAsDataURL(file);
    if (activeSide === 'back') {
      setEditing((prev) => ({
        ...prev,
        photoBack: dataUrl,
        areaBack: defaultArea(prev.type, 'back', true),
      }));
    } else {
      setEditing((prev) => ({
        ...prev,
        photo: dataUrl,
        area: defaultArea(prev.type, 'front', true),
      }));
    }
  };

  const handleResetArea = () => {
    const hasPh = activeSide === 'back' ? Boolean(editing.photoBack) : Boolean(editing.photo);
    setArea(defaultArea(editing.type, activeSide, hasPh));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing.colors.length) {
      alert('Select at least one color');
      return;
    }
    const id = editing.id || newId();
    await onSave({ ...editing, id });
    setEditing({
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
      area: defaultArea('tshirt', 'front', false),
      areaBack: defaultArea('tshirt', 'back', false),
      active: true,
      order: products.length,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Product Form on Left */}
      <div className="lg:col-span-7 bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex justify-between items-center">
          <h4 className="font-anton text-xl tracking-wide uppercase text-[#141414]">
            {editing.id ? 'Edit Product' : 'Add New Product'}
          </h4>
          {editing.id && (
            <button
              type="button"
              onClick={() =>
                setEditing({
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
                  area: defaultArea('tshirt', 'front', false),
                  areaBack: defaultArea('tshirt', 'back', false),
                  active: true,
                  order: products.length,
                })
              }
              className="text-xs font-bold text-[#ff4d1c] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
              Product Name
            </label>
            <input
              type="text"
              required
              maxLength={80}
              placeholder="e.g. Classic Heavy Tee"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
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
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
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
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
                Print Fee / Side
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={editing.printPrice}
                onChange={(e) => setEditing({ ...editing, printPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
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
              Customers can also customize and print on the back
            </span>
          </label>

          {/* Interactive Print Area Editor Canvas */}
          <div className="border-[1.5px] border-[#ddd6c8] rounded-xl p-4 bg-white space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6b665d]">
                Image & Print Area Positioning
              </span>
              <div className="flex gap-1.5">
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

            <div className="flex justify-between items-center pt-2">
              <label className="cursor-pointer text-xs font-bold text-[#ff4d1c] hover:underline flex items-center gap-1">
                <span>Upload {activeSide} photo</span>
                <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
              </label>

              <button
                type="button"
                onClick={handleResetArea}
                className="text-xs text-[#6b665d] hover:text-black flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset box</span>
              </button>
            </div>
          </div>

          {/* Available Colors */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1.5">
              Available Colors
            </label>
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
                    }}
                    className={`w-7 h-7 rounded-full border border-black/20 transition-all ${
                      isSelected ? 'ring-2 ring-[#141414] ring-offset-2 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1.5">
              Sizes
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              maxLength={600}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              className="accent-[#ff4d1c] w-4 h-4 rounded"
            />
            <span className="text-xs font-medium text-[#141414]">Visible in store catalog</span>
          </label>

          <button
            type="submit"
            className="w-full bg-[#141414] hover:bg-[#ff4d1c] text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3 rounded-full font-bold text-sm transition-colors"
          >
            {editing.id ? 'Save Changes' : 'Create Product'}
          </button>
        </form>
      </div>

      {/* Product List on Right */}
      <div className="lg:col-span-5 space-y-4">
        <h4 className="font-anton text-lg tracking-wide uppercase text-[#141414]">
          Products ({products.length})
        </h4>

        <div className="space-y-3">
          {products.map((p) => {
            const thumb = p.photo || svgURL(p.type, p.colors[0] || '#ffffff', 'front');
            const garment = GARMENTS[p.type] || GARMENTS.tshirt;

            return (
              <div
                key={p.id}
                className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-xl p-3 flex items-center gap-3 transition-shadow hover:shadow-sm"
              >
                <img
                  src={thumb}
                  alt=""
                  className="w-14 h-16 object-contain bg-[#ebe6dc] rounded-lg p-1 border border-[#ddd6c8]"
                />

                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-sm text-[#141414] truncate">
                    {p.name}
                    {!p.active && <span className="text-xs text-[#b3261e] ml-1.5">(Hidden)</span>}
                  </h5>
                  <div className="text-xs text-[#6b665d] truncate">
                    {garment.label} · {p.price} {currency} · {p.hasBack ? 'Front & Back' : 'Front'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditing(p);
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
