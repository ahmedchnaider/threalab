'use client';

import React, { useState } from 'react';
import { Collection, CollectionImage } from '@/lib/types';
import { shrinkImage } from '@/lib/canvas-utils';
import { newId } from '@/lib/mock-data';
import { useToast } from '@/context/ToastContext';
import {
  Plus,
  Trash2,
  Edit3,
  Upload,
  Check,
  X,
  Eye,
  EyeOff,
  Star,
  ImageIcon,
  ArrowLeft,
  Loader2,
  Tag,
} from 'lucide-react';

const ALL_GARMENT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

interface CollectionsManagerProps {
  collections: Collection[];
  currency?: string;
  onSave: (collection: Collection) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CollectionsManager({
  collections,
  currency = 'TND',
  onSave,
  onDelete,
}: CollectionsManagerProps) {
  const { toast } = useToast();

  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formPrice, setFormPrice] = useState<number | ''>(55);
  const [formSizes, setFormSizes] = useState<string[]>(DEFAULT_SIZES);
  const [formImages, setFormImages] = useState<CollectionImage[]>([]);
  const [formCoverImage, setFormCoverImage] = useState<string>('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startCreate = () => {
    setEditingCollection(null);
    setIsCreating(true);
    setFormName('');
    setFormDescription('');
    setFormActive(true);
    setFormPrice(55);
    setFormSizes(DEFAULT_SIZES);
    setFormImages([]);
    setFormCoverImage('');
  };

  const startEdit = (c: Collection) => {
    setEditingCollection(c);
    setIsCreating(false);
    setFormName(c.name);
    setFormDescription(c.description || '');
    setFormActive(c.active);
    const initialPrice = typeof c.price === 'number' ? c.price : (c.images?.[0]?.price || 55);
    const initialSizes =
      Array.isArray(c.sizes) && c.sizes.length > 0
        ? c.sizes
        : c.images?.[0]?.sizes && c.images[0].sizes.length > 0
          ? c.images[0].sizes
          : DEFAULT_SIZES;

    setFormPrice(initialPrice);
    setFormSizes(initialSizes);
    setFormImages(
      (c.images || []).map((img, i) => ({
        ...img,
        title: img.title || img.caption || `Piece #${i + 1}`,
        price: typeof img.price === 'number' && !isNaN(img.price) ? img.price : initialPrice,
        garmentType: img.garmentType || 'tshirt',
        sizes: img.sizes && img.sizes.length > 0 ? img.sizes : initialSizes,
      }))
    );
    setFormCoverImage(c.coverImage || (c.images?.[0]?.url || ''));
  };

  const cancelEdit = () => {
    setEditingCollection(null);
    setIsCreating(false);
    setFormName('');
    setFormDescription('');
    setFormPrice(55);
    setFormSizes(DEFAULT_SIZES);
    setFormImages([]);
    setFormCoverImage('');
  };

  const handleCollectionPriceChange = (val: number | '') => {
    setFormPrice(val);
    if (typeof val === 'number' && val >= 0) {
      setFormImages((prev) => prev.map((img) => ({ ...img, price: val })));
    }
  };

  const handleToggleSize = (sizeToToggle: string) => {
    let updatedSizes: string[];
    if (formSizes.includes(sizeToToggle)) {
      if (formSizes.length <= 1) {
        toast('At least one size must remain selected');
        return;
      }
      updatedSizes = formSizes.filter((s) => s !== sizeToToggle);
    } else {
      updatedSizes = ALL_GARMENT_SIZES.filter(
        (s) => formSizes.includes(s) || s === sizeToToggle
      );
    }
    setFormSizes(updatedSizes);
    setFormImages((prev) => prev.map((img) => ({ ...img, sizes: updatedSizes })));
    toast(`Sizes updated for all products: ${updatedSizes.join(', ')}`);
  };

  const handleSetPresetSizes = (preset: string[]) => {
    setFormSizes(preset);
    setFormImages((prev) => prev.map((img) => ({ ...img, sizes: preset })));
    toast(`Sizes set to: ${preset.join(', ')}`);
  };

  // Process uploaded files and add to current collection images
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    const newItems: CollectionImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      setUploadStatus(`Uploading ${i + 1}/${files.length}...`);

      let finalUrl = '';

      // 1. Try streaming directly to Supabase storage via /api/upload
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'media');
        formData.append('folder', 'collections');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            finalUrl = data.url;
          }
        }
      } catch (err) {
        console.warn('Direct upload failed, falling back to local compression', err);
      }

      // 2. Fallback to compact compressed JPEG if direct upload failed
      if (!finalUrl) {
        try {
          finalUrl = await shrinkImage(file, 1000, 'jpeg');
        } catch (err) {
          toast(`Could not process ${file.name}`);
          continue;
        }
      }

      const defaultItemPrice = typeof formPrice === 'number' && formPrice >= 0 ? formPrice : 55;
      const baseSizes = formSizes.length > 0 ? formSizes : DEFAULT_SIZES;
      const item: CollectionImage = {
        id: newId(),
        url: finalUrl,
        title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        caption: '',
        price: defaultItemPrice,
        garmentType: 'tshirt',
        sizes: baseSizes,
        order: formImages.length + newItems.length,
      };
      newItems.push(item);
    }

    if (newItems.length > 0) {
      const updated = [...formImages, ...newItems];
      setFormImages(updated);
      if (!formCoverImage) {
        setFormCoverImage(updated[0].url);
      }
      toast(`${newItems.length} image${newItems.length > 1 ? 's' : ''} added`);
    }

    setUploadStatus('');
    setIsUploading(false);
    e.target.value = '';
  };

  const handleDeleteImage = (imgId: string) => {
    const updated = formImages.filter((img) => img.id !== imgId);
    setFormImages(updated);

    // If deleted image was cover, pick first available
    const deletedImg = formImages.find((img) => img.id === imgId);
    if (deletedImg && deletedImg.url === formCoverImage) {
      setFormCoverImage(updated.length > 0 ? updated[0].url : '');
    }

    toast('Image removed from collection');
  };

  const handleSetCover = (url: string) => {
    setFormCoverImage(url);
    toast('Cover image updated');
  };

  const handleUpdateCaption = (imgId: string, caption: string) => {
    setFormImages((prev) =>
      prev.map((img) => (img.id === imgId ? { ...img, caption } : img))
    );
  };

  const handleUpdateImageField = (
    imgId: string,
    field: 'title' | 'caption' | 'price' | 'garmentType',
    value: any
  ) => {
    setFormImages((prev) =>
      prev.map((img) => (img.id === imgId ? { ...img, [field]: value } : img))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      alert('Please enter a collection name');
      return;
    }

    setIsSaving(true);
    try {
      const baseCollectionPrice = typeof formPrice === 'number' && formPrice >= 0 ? formPrice : 55;
      const baseSizes = formSizes.length > 0 ? formSizes : DEFAULT_SIZES;
      const cleanedImages: CollectionImage[] = formImages.map((img, i) => {
        const rawPrice = Number(img.price);
        const validPrice = typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : baseCollectionPrice;
        return {
          ...img,
          title: (img.title || img.caption || `Piece #${i + 1}`).trim(),
          price: validPrice,
          garmentType: img.garmentType || 'tshirt',
          sizes: img.sizes && img.sizes.length > 0 ? img.sizes : baseSizes,
          order: i,
        };
      });

      const collectionToSave: Collection = {
        id: editingCollection ? editingCollection.id : newId(),
        name: cleanName,
        description: formDescription.trim(),
        coverImage: formCoverImage || (cleanedImages[0]?.url || ''),
        price: baseCollectionPrice,
        sizes: baseSizes,
        images: cleanedImages,
        active: formActive,
        order: editingCollection ? editingCollection.order : collections.length,
        createdAt: editingCollection ? editingCollection.createdAt : Date.now(),
      };

      await onSave(collectionToSave);
      toast(editingCollection ? 'Collection updated' : 'Collection created');
      cancelEdit();
    } catch (err: any) {
      console.error('Failed to save collection:', err);
      toast(err?.message || 'Failed to save collection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (c: Collection) => {
    const updated: Collection = { ...c, active: !c.active };
    await onSave(updated);
    toast(updated.active ? 'Collection visible in shop' : 'Collection hidden from shop');
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
      if (editingCollection?.id === id) {
        cancelEdit();
      }
      toast('Collection deleted');
    } catch {
      toast('Failed to delete collection');
    }
  };

  // ===================== FORM / EDITOR VIEW =====================
  if (isCreating || editingCollection) {
    return (
      <div className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#ddd6c8]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancelEdit}
              className="p-2 rounded-full border border-[#141414] hover:bg-[#141414] hover:text-[#f4f1ea] transition-colors"
              title="Back to Collections"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-anton text-2xl uppercase tracking-wide text-[#141414]">
                {editingCollection ? `Edit Collection: ${editingCollection.name}` : 'New Collection'}
              </h3>
              <p className="text-xs text-[#6b665d]">
                Upload lookbook photos and products to showcase in your shop.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 rounded-full border border-[#141414] text-xs font-bold hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-full bg-[#141414] text-[#f4f1ea] text-xs font-bold hover:bg-[#ff4d1c] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Collection</span>
                </>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5">
                Collection Name *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Summer Drop 2026, Core Essentials, Heavyweight Series"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#141414] bg-white text-sm text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-[#ff4d1c] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Price for All Products ({currency}) *</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={formPrice}
                  onChange={(e) => {
                    const v = e.target.value;
                    handleCollectionPriceChange(v === '' ? '' : Math.max(0, parseFloat(v) || 0));
                  }}
                  placeholder="e.g. 55"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#ff4d1c] bg-[#fffdf8] text-sm font-bold font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
                />
              </div>
              <span className="text-[10px] text-[#6b665d] mt-1 block">
                Automatically sets price for all pieces in this collection
              </span>
            </div>

            <div className="md:col-span-3 flex items-center pt-5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-5 h-5 accent-[#ff4d1c] rounded cursor-pointer"
                />
                <span className="text-sm font-bold text-[#141414]">
                  Active (visible in shop)
                </span>
              </label>
            </div>

            {/* Available Sizes for All Products */}
            <div className="md:col-span-12 bg-[#ebe6dc]/40 border-2 border-[#141414] p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-[#141414] uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#ff4d1c]" />
                    <span>Available Sizes for All Products in Collection *</span>
                  </label>
                  <p className="text-[11px] text-[#6b665d] mt-0.5">
                    Select the garment sizes customers can purchase for all pieces in this collection.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-[#6b665d] mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleSetPresetSizes(['S', 'M', 'L', 'XL', 'XXL'])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-[#141414] hover:text-white border border-[#141414] transition-colors shadow-xs"
                  >
                    Standard (S-XXL)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetSizes(ALL_GARMENT_SIZES)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-[#141414] hover:text-white border border-[#141414] transition-colors shadow-xs"
                  >
                    All (XS-3XL)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetSizes(['L', 'XL', 'XXL', '3XL'])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-[#141414] hover:text-white border border-[#141414] transition-colors shadow-xs"
                  >
                    Plus (L-3XL)
                  </button>
                </div>
              </div>

              {/* Size Buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {ALL_GARMENT_SIZES.map((sz: string) => {
                  const isSelected = formSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleToggleSize(sz)}
                      className={`min-w-[50px] h-10 px-3 rounded-xl text-xs font-bold font-mono border-2 flex items-center justify-center gap-1.5 transition-all select-none ${isSelected
                        ? 'bg-[#141414] text-[#f4f1ea] border-[#141414] shadow-sm ring-2 ring-[#ff4d1c]/40'
                        : 'bg-white text-[#6b665d] border-[#ddd6c8] hover:border-[#141414] hover:text-[#141414]'
                        }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-[#ff4d1c]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ddd6c8]" />
                      )}
                      <span>{sz}</span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-[#6b665d] flex items-center gap-2 pt-1 border-t border-[#ddd6c8]/60">
                <span className="font-bold text-[#141414]">Currently chosen:</span>
                <span className="font-mono text-[#ff4d1c] font-bold">{formSizes.join(', ')}</span>
                <span>({formSizes.length} sizes active)</span>
              </div>
            </div>

            <div className="md:col-span-12">
              <label className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5">
                Description / Story (optional)
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Tell customers about this drop, fabrics, inspiration, or limited edition details..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#141414] bg-white text-sm text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#ff4d1c]"
              />
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-4 pt-4 border-t border-[#ddd6c8]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-anton text-lg uppercase tracking-wide text-[#141414]">
                  Collection Images ({formImages.length})
                </h4>
                <p className="text-xs text-[#6b665d]">
                  Add high-resolution photos. Customers can browse these in the shop lookbook gallery.
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#141414] text-[#f4f1ea] text-xs font-bold hover:bg-[#ff4d1c] transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? (uploadStatus || 'Uploading...') : 'Add Images'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={isUploading}
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Bulk Price Setter */}
            {formImages.length > 0 && (
              <div className="bg-[#ebe6dc]/60 border border-[#ddd6c8] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#ff4d1c]" />
                  <span className="font-bold text-[#141414]">Bulk Price Tool:</span>
                  <span className="text-[#6b665d]">Set the same price for all {formImages.length} pieces</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 55"
                    id="bulk-price-input"
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-[#141414] bg-white text-xs font-bold font-mono focus:outline-none"
                  />
                  <span className="font-bold text-[#141414]">{currency}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('bulk-price-input') as HTMLInputElement;
                      const val = Number(input?.value);
                      if (!val || val <= 0) {
                        alert('Enter a valid price');
                        return;
                      }
                      setFormImages((prev) => prev.map((img) => ({ ...img, price: val })));
                      toast(`Updated all pieces to ${val} ${currency}`);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#141414] text-white hover:bg-[#ff4d1c] font-bold text-xs transition-colors"
                  >
                    Apply to All
                  </button>
                </div>
              </div>
            )}

            {/* Upload Zone / Drop Area if empty */}
            {formImages.length === 0 ? (
              <label className="border-2 border-dashed border-[#141414] rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 transition-colors text-center">
                <div className="w-12 h-12 rounded-full bg-[#ebe6dc] flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-[#ff4d1c]" />
                </div>
                <span className="font-bold text-sm text-[#141414]">
                  Click to select collection images
                </span>
                <span className="text-xs text-[#6b665d] mt-1">
                  Upload multiple photos (JPEG, PNG, WebP)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={isUploading}
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            ) : (
              /* Image Grid with Delete and Set Cover buttons */
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {formImages.map((img, idx) => {
                  const isCover =
                    formCoverImage === img.url || (!formCoverImage && idx === 0);

                  return (
                    <div
                      key={img.id || idx}
                      className={`group relative bg-white border rounded-xl overflow-hidden shadow-sm transition-all flex flex-col ${isCover
                        ? 'border-[#ff4d1c] ring-2 ring-[#ff4d1c]/30'
                        : 'border-[#ddd6c8] hover:border-[#141414]'
                        }`}
                    >
                      {/* Image Thumbnail Container */}
                      <div className="relative aspect-square bg-[#f4f1ea] overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.caption || `Collection image ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Cover Badge */}
                        {isCover && (
                          <div className="absolute top-2 left-2 bg-[#ff4d1c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                            <Star className="w-3 h-3 fill-current" />
                            <span>Cover</span>
                          </div>
                        )}

                        {/* Quick Overlay Action Buttons */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCover(img.url)}
                              className="p-2 rounded-full bg-white text-[#141414] hover:bg-[#ff4d1c] hover:text-white transition-colors shadow"
                              title="Set as Cover Image"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            className="p-2 rounded-full bg-white text-[#8a1c1c] hover:bg-[#8a1c1c] hover:text-white transition-colors shadow"
                            title="Delete this image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Image Details / Product Fields */}
                      <div className="p-2.5 space-y-2 bg-white text-xs">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-[#6b665d] block mb-0.5">
                            Product Title
                          </label>
                          <input
                            type="text"
                            value={img.title || img.caption || ''}
                            placeholder="e.g. Graphic Tee"
                            onChange={(e) => handleUpdateImageField(img.id, 'title', e.target.value)}
                            className="w-full text-xs px-2 py-1 rounded border border-[#ddd6c8] focus:border-[#141414] focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-[#ff4d1c] block mb-0.5">
                              Price ({currency}) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={img.price !== undefined ? img.price : ''}
                              placeholder="45"
                              onChange={(e) => {
                                const v = e.target.value;
                                handleUpdateImageField(
                                  img.id,
                                  'price',
                                  v === '' ? '' : Math.max(0, parseFloat(v) || 0)
                                );
                              }}
                              className="w-full text-xs font-bold font-mono px-2 py-1.5 rounded-lg border-2 border-[#141414] focus:border-[#ff4d1c] focus:outline-none bg-[#fffdf8]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-[#6b665d] block mb-0.5">
                              Type
                            </label>
                            <select
                              value={img.garmentType || 'tshirt'}
                              onChange={(e) => handleUpdateImageField(img.id, 'garmentType', e.target.value)}
                              className="w-full text-xs px-2 py-1.5 rounded-lg border border-[#ddd6c8] focus:border-[#141414] focus:outline-none bg-white cursor-pointer"
                            >
                              <option value="tshirt">T-Shirt</option>
                              <option value="hoodie">Hoodie</option>
                              <option value="sweatshirt">Sweatshirt</option>
                              <option value="tote">Tote</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#6b665d] pt-1 border-t border-[#f4f1ea]">
                          <span className="font-bold text-[#141414]">Sizes:</span>
                          <span className="font-mono text-[#ff4d1c] font-bold truncate max-w-[110px]" title={(img.sizes && img.sizes.length > 0 ? img.sizes : formSizes).join(', ')}>
                            {(img.sizes && img.sizes.length > 0 ? img.sizes : formSizes).join(', ')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-[#6b665d] pt-1 border-t border-[#f4f1ea]">
                          <span>Look #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            className="text-[#8a1c1c] hover:underline flex items-center gap-0.5 font-bold"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </div>
    );
  }

  // ===================== LIST VIEW =====================
  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ddd6c8]">
        <div>
          <h3 className="font-anton text-2xl uppercase tracking-wide text-[#141414]">
            Lookbook & Collections ({collections.length})
          </h3>
          <p className="text-xs text-[#6b665d]">
            Curate photo collections and lookbooks that display automatically in your shop.
          </p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="px-4 py-2.5 rounded-full bg-[#141414] text-[#f4f1ea] text-xs font-bold hover:bg-[#ff4d1c] transition-colors flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Collection</span>
        </button>
      </div>

      {/* Collection Cards Grid */}
      {collections.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-[#ddd6c8] rounded-2xl p-16 text-center space-y-4 text-[#6b665d]">
          <div className="w-12 h-12 rounded-full bg-[#ebe6dc] flex items-center justify-center mx-auto text-[#141414]">
            <ImageIcon className="w-6 h-6" />
          </div>
          <p className="text-sm">No collections created yet.</p>
          <button
            type="button"
            onClick={startCreate}
            className="inline-block bg-[#141414] text-[#f4f1ea] px-6 py-2.5 rounded-full text-xs font-bold hover:bg-[#ff4d1c] transition-colors"
          >
            Create your first collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((c) => {
            const cover = c.coverImage || (c.images?.[0]?.url || '');
            const imageCount = c.images?.length || 0;

            return (
              <div
                key={c.id}
                className="bg-[#fffdf8] border-[1.5px] border-[#141414] rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Collection Cover Image */}
                <div className="relative aspect-[16/10] bg-[#ebe6dc] overflow-hidden border-b border-[#141414]">
                  {cover ? (
                    <img
                      src={cover}
                      alt={c.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#6b665d]">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-xs">No images</span>
                    </div>
                  )}

                  {/* Active / Hidden Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(c)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow backdrop-blur-sm transition-colors ${c.active
                        ? 'bg-[#141414] text-[#f4f1ea] hover:bg-[#ff4d1c]'
                        : 'bg-white/90 text-[#6b665d] hover:bg-white'
                        }`}
                      title={c.active ? 'Click to hide from shop' : 'Click to show in shop'}
                    >
                      {c.active ? (
                        <>
                          <Eye className="w-3 h-3 text-[#ff4d1c]" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Image count badge */}
                  <div className="absolute bottom-3 left-3 bg-[#141414]/80 text-[#f4f1ea] text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#ff4d1c]" />
                    <span>{imageCount} photo{imageCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="font-anton text-xl uppercase tracking-wide text-[#141414]">
                      {c.name}
                    </h4>
                    {c.description && (
                      <p className="text-xs text-[#6b665d] line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Mini thumbnails preview */}
                  {c.images && c.images.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                      {c.images.slice(0, 6).map((img, idx) => (
                        <div
                          key={img.id || idx}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-[#ddd6c8] shrink-0 bg-[#ebe6dc]"
                        >
                          <img
                            src={img.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {c.images.length > 6 && (
                        <div className="w-10 h-10 rounded-lg border border-[#ddd6c8] shrink-0 bg-[#ebe6dc] flex items-center justify-center text-[10px] font-bold text-[#6b665d]">
                          +{c.images.length - 6}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price info */}
                  {(() => {
                    const prices = (c.images || [])
                      .map((img) => img.price)
                      .filter((p): p is number => typeof p === 'number' && p > 0);
                    const min = prices.length > 0 ? Math.min(...prices) : 45;
                    const max = prices.length > 0 ? Math.max(...prices) : 45;
                    return (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#141414] bg-[#ebe6dc]/40 px-3 py-1.5 rounded-xl border border-[#ddd6c8]">
                        <Tag className="w-3.5 h-3.5 text-[#ff4d1c]" />
                        <span>
                          {prices.length > 0
                            ? min === max
                              ? `${min} ${currency}`
                              : `${min} - ${max} ${currency}`
                            : `45 ${currency}`}
                        </span>
                        <span className="text-[10px] text-[#6b665d] font-normal">
                          · {c.images?.length || 0} pieces
                        </span>
                      </div>
                    );
                  })()}

                  {/* Sizes info */}
                  {(() => {
                    const colSizes: string[] =
                      Array.isArray(c.sizes) && c.sizes.length > 0
                        ? c.sizes
                        : c.images?.[0]?.sizes && c.images[0].sizes.length > 0
                          ? c.images[0].sizes
                          : DEFAULT_SIZES;
                    return (
                      <div className="flex items-center gap-2 text-xs text-[#6b665d]">
                        <span className="font-bold text-[#141414]">Sizes:</span>
                        <div className="flex gap-1 flex-wrap">
                          {colSizes.map((sz: string) => (
                            <span
                              key={sz}
                              className="px-1.5 py-0.5 rounded bg-[#ebe6dc] text-[10px] font-bold font-mono text-[#141414] border border-[#ddd6c8]"
                            >
                              {sz}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#ddd6c8] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#f4f1ea] hover:bg-[#ff4d1c] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Prices & Pieces</span>
                    </button>

                    {confirmDeleteId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteCollection(c.id)}
                          className="px-2.5 py-1 rounded-full bg-[#8a1c1c] text-white text-[11px] font-bold hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 rounded-full hover:bg-black/5 text-[#6b665d]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="p-2 rounded-full text-[#6b665d] hover:text-[#8a1c1c] hover:bg-black/5 transition-colors"
                        title="Delete Collection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
