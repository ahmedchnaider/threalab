'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Layer, PrintArea, Side } from '@/lib/types';
import { drawBase, drawLayer, measureLayer } from '@/lib/canvas-utils';
import { Maximize2, UploadCloud } from 'lucide-react';

interface CanvasStageProps {
  side: Side;
  area: PrintArea;
  layers: Layer[];
  selectedIndex: number;
  baseImg: HTMLImageElement | null;
  isPhoto: boolean;
  layerImages: Record<string, HTMLImageElement>;
  onSelectLayer: (index: number) => void;
  onUpdateLayer: (index: number, updates: Partial<Layer>) => void;
  onDropFiles: (files: FileList) => void;
  onZoom: () => void;
}

export function CanvasStage({
  side,
  area,
  layers,
  selectedIndex,
  baseImg,
  isPhoto,
  layerImages,
  onSelectLayer,
  onUpdateLayer,
  onDropFiles,
  onZoom,
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragRef = useRef<{
    mode: 'move' | 'scale';
    p0: { x: number; y: number };
    cx: number;
    cy: number;
    s: number;
    d0: number;
  } | null>(null);

  // Redraw canvas
  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 600, 700);
    drawBase(ctx, baseImg, isPhoto);

    // Draw print area bounds & clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();
    for (const l of layers) {
      drawLayer(ctx, l, layerImages[l.id]);
    }
    ctx.restore();

    // Print area dashed outline
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 77, 28, 0.7)';
    ctx.strokeRect(area.x, area.y, area.w, area.h);

    if (layers.length === 0) {
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 77, 28, 0.85)';
      ctx.font = '600 13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${side.toUpperCase()} PRINT AREA`, area.x + area.w / 2, area.y + area.h / 2);
    }
    ctx.restore();

    // Draw selected layer bounding box and scale handle
    const sel = layers[selectedIndex];
    if (sel) {
      const d = measureLayer(sel, ctx);
      ctx.save();
      ctx.translate(sel.cx, sel.cy);
      ctx.rotate((sel.rot * Math.PI) / 180);

      ctx.strokeStyle = '#ff4d1c';
      ctx.lineWidth = 2;
      ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);

      // Handle circle
      ctx.beginPath();
      ctx.arc(d.w / 2, d.h / 2, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }, [area, baseImg, isPhoto, layers, layerImages, selectedIndex, side]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer coordinate transformation
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * 600) / r.width,
      y: ((e.clientY - r.top) * 700) / r.height,
    };
  };

  const getLocalPoint = (l: Layer, p: { x: number; y: number }) => {
    const rad = (-l.rot * Math.PI) / 180;
    const dx = p.x - l.cx;
    const dy = p.y - l.cy;
    return {
      x: dx * Math.cos(rad) - dy * Math.sin(rad),
      y: dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  };

  const isOverHandle = (p: { x: number; y: number }, l: Layer) => {
    const ctx = canvasRef.current?.getContext('2d');
    const d = measureLayer(l, ctx);
    const q = getLocalPoint(l, p);
    return Math.hypot(q.x - d.w / 2, q.y - d.h / 2) < 26;
  };

  const findHitLayer = (p: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d');
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const d = measureLayer(l, ctx);
      const q = getLocalPoint(l, p);
      if (Math.abs(q.x) <= d.w / 2 && Math.abs(q.y) <= d.h / 2) {
        return i;
      }
    }
    return -1;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getCanvasPoint(e);
    const sel = layers[selectedIndex];
    let mode: 'move' | 'scale' | null = sel && isOverHandle(p, sel) ? 'scale' : null;

    if (!mode) {
      const hit = findHitLayer(p);
      if (hit !== selectedIndex) {
        onSelectLayer(hit);
      }
      if (hit >= 0) {
        mode = 'move';
      }
    }

    if (mode && layers[selectedIndex]) {
      const l = layers[selectedIndex];
      dragRef.current = {
        mode,
        p0: p,
        cx: l.cx,
        cy: l.cy,
        s: l.s,
        d0: Math.max(1, Math.hypot(p.x - l.cx, p.y - l.cy)),
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getCanvasPoint(e);
    const drag = dragRef.current;
    const sel = layers[selectedIndex];

    if (!drag) {
      if (sel && isOverHandle(p, sel)) {
        e.currentTarget.style.cursor = 'nwse-resize';
      } else if (findHitLayer(p) >= 0) {
        e.currentTarget.style.cursor = 'move';
      } else {
        e.currentTarget.style.cursor = 'default';
      }
      return;
    }

    if (!sel) return;

    if (drag.mode === 'move') {
      const newCx = drag.cx + (p.x - drag.p0.x);
      const newCy = drag.cy + (p.y - drag.p0.y);
      onUpdateLayer(selectedIndex, { cx: newCx, cy: newCy });
    } else {
      const currentDist = Math.hypot(p.x - sel.cx, p.y - sel.cy);
      const newScale = Math.min(12, Math.max(0.05, (drag.s * currentDist) / drag.d0));
      onUpdateLayer(selectedIndex, { s: newScale });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      //
    }
  };

  return (
    <div
      className={`relative sticky top-20 bg-[#ebe6dc] border-[1.5px] border-[#141414] rounded-2xl p-3 sm:p-4 transition-all ${
        isDragOver ? 'ring-4 ring-[#ff4d1c] ring-offset-2' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files?.length) {
          onDropFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Zoom Button */}
      <button
        onClick={onZoom}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-[#fffdf8]/90 border border-[#141414] hover:bg-[#141414] hover:text-white flex items-center justify-center transition-colors shadow-sm"
        title="View full screen mockup"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={600}
        height={700}
        className="w-full max-w-[540px] mx-auto aspect-[6/7] block rounded-xl touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="mt-2 text-center text-xs text-[#6b665d] flex items-center justify-center gap-1.5 font-medium">
        <UploadCloud className="w-3.5 h-3.5 text-[#ff4d1c]" />
        <span>Drag to move · Pull round corner to scale · Drop images directly here</span>
      </div>
    </div>
  );
}
