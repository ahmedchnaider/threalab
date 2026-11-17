'use client';

import React, { useState } from 'react';
import { Design } from '@/lib/types';
import { shrinkImage } from '@/lib/canvas-utils';
import { newId } from '@/lib/mock-data';
import { Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface DesignsManagerProps {
  designs: Design[];
  onSave: (design: Design) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DesignsManager({ designs, onSave, onDelete }: DesignsManagerProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [pendingImages, setPendingImages] = useState<Array<{ name: string; image: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    const loaded: Array<{ name: string; image: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const image = await shrinkImage(file);
        loaded.push({
          name: file.name.replace(/\.[^.]+$/, ''),
          image,
        });
      } catch {
        toast(`Could not process ${file.name}`);
      }
    }

    setPendingImages(loaded);
    setIsUploading(false);
    if (loaded.length === 1 && !name) {
      setName(loaded[0].name);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingImages.length) {
      alert('Select an image file first');
      return;
    }

    for (let i = 0; i < pendingImages.length; i++) {
      const item = pendingImages[i];
      const designName =
        pendingImages.length === 1
          ? name || item.name
          : name
          ? `${name} ${i + 1}`
          : item.name;

      await onSave({
        id: newId(),
        name: designName,
        category: category.trim() || 'General',
        image: item.image,
        active: true,
        createdAt: Date.now() + i,
      });
    }

    setPendingImages([]);
    setName('');
    setCategory('');
    toast(pendingImages.length > 1 ? `${pendingImages.length} designs added` : 'Design added');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Upload Form on Left */}
      <div className="lg:col-span-5 bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-5 sm:p-6 space-y-4">
        <h4 className="font-anton text-xl tracking-wide uppercase text-[#141414]">
          Add Artwork & Designs
        </h4>
        <p className="text-xs text-[#6b665d]">
          Customers can pick these ready-made designs in the studio. Use transparent PNGs for best results.
        </p>

        <form onSubmit={handleAdd} className="space-y-4 text-sm">
          {/* File Picker */}
          <div>
            <label className="border-2 border-dashed border-[#141414] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 transition-colors text-center">
              <Upload className="w-6 h-6 text-[#ff4d1c] mb-1.5" />
              <span className="font-bold text-xs text-[#141414]">
                {pendingImages.length
                  ? `${pendingImages.length} images selected`
                  : 'Click or drop PNG files here'}
              </span>
              <span className="text-[11px] text-[#6b665d]">Select multiple images to batch upload</span>
              <input type="file" accept="image/*" multiple hidden onChange={handleFiles} />
            </label>
          </div>

          {/* Pending preview thumbnails */}
          {pendingImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto p-1 bg-[#ebe6dc] rounded-xl">
              {pendingImages.map((p, idx) => (
                <div key={idx} className="w-14 h-14 rounded-lg checker-bg p-1 shrink-0">
                  <img src={p.image} alt="" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
              Design Name
            </label>
            <input
              type="text"
              maxLength={60}
              placeholder="e.g. Vintage Palm Logo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b665d] mb-1">
              Category
            </label>
            <input
              type="text"
              maxLength={30}
              placeholder="e.g. Logos, Arabic, Minimal"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || !pendingImages.length}
            className="w-full bg-[#141414] hover:bg-[#ff4d1c] disabled:opacity-50 text-[#f4f1ea] border-[1.5px] border-[#141414] hover:border-[#ff4d1c] py-3 rounded-full font-bold text-sm transition-colors"
          >
            {isUploading ? 'Preparing…' : 'Add Design to Store'}
          </button>
        </form>
      </div>

      {/* Designs Grid on Right */}
      <div className="lg:col-span-7 space-y-4">
        <h4 className="font-anton text-lg tracking-wide uppercase text-[#141414]">
          Design Library ({designs.length})
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {designs.map((d) => (
            <div
              key={d.id}
              className={`bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-xl p-3 flex flex-col gap-2 transition-all ${
                !d.active ? 'opacity-50' : ''
              }`}
            >
              <div className="w-full aspect-square checker-bg rounded-lg p-2 flex items-center justify-center overflow-hidden">
                <img src={d.image} alt={d.name} className="w-full h-full object-contain" />
              </div>

              <div className="min-w-0">
                <div className="font-bold text-xs truncate text-[#141414]">{d.name}</div>
                <div className="text-[10px] text-[#6b665d] truncate">{d.category}</div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-[#ddd6c8]">
                <button
                  onClick={() => onSave({ ...d, active: !d.active })}
                  className="p-1.5 rounded-lg border border-[#141414] hover:bg-black/5 text-[#141414] transition-colors"
                  title={d.active ? 'Hide from studio' : 'Show in studio'}
                >
                  {d.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onDelete(d.id)}
                  className="p-1.5 rounded-lg border border-[#b3261e] text-[#b3261e] hover:bg-[#b3261e] hover:text-white transition-colors"
                  title="Delete design"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
