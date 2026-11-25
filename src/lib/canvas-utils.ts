import { Layer, PrintArea, TextLayer } from './types';

export const FONTS = [
  { n: 'Anton', w: 400 },
  { n: 'Bebas Neue', w: 400 },
  { n: 'Permanent Marker', w: 400 },
  { n: 'Pacifico', w: 400 },
  { n: 'Playfair Display', w: 700 },
  { n: 'Space Grotesk', w: 700 },
];

const imgCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImg(src: string): Promise<HTMLImageElement> {
  if (imgCache.has(src)) {
    return imgCache.get(src)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (/^https?:/.test(src)) {
      img.crossOrigin = 'anonymous';
      const sep = src.includes('?') ? '&' : '?';
      img.src = src + sep + 'cors=1';
    } else {
      img.src = src;
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      imgCache.delete(src);
      reject(err);
    };
  });
  imgCache.set(src, promise);
  return promise;
}

export async function ensureFont(name: string): Promise<void> {
  const font = FONTS.find((f) => f.n === name);
  const weight = font?.w || 400;
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.load(`${weight} 48px "${name}"`);
    } catch {
      // Font fallback
    }
  }
}

export function fontStr(l: TextLayer): string {
  const font = FONTS.find((f) => f.n === l.font);
  const weight = font?.w || 400;
  return `${weight} ${Math.round(l.baseSize * l.s)}px "${l.font}"`;
}

export function measureLayer(l: Layer, ctx?: CanvasRenderingContext2D | null): { w: number; h: number } {
  if (l.type === 'img') {
    return { w: l.w0 * l.s, h: l.h0 * l.s };
  }
  if (ctx) {
    ctx.save();
    ctx.font = fontStr(l);
    const m = ctx.measureText(l.text || ' ');
    ctx.restore();
    return { w: m.width + 10, h: l.baseSize * l.s * 1.25 };
  }
  // Rough fallback if no context
  return { w: (l.text.length * (l.baseSize * l.s) * 0.6) + 10, h: l.baseSize * l.s * 1.25 };
}

export function drawLayer(ctx: CanvasRenderingContext2D, l: Layer, imgElem?: HTMLImageElement): void {
  ctx.save();
  ctx.translate(l.cx, l.cy);
  ctx.rotate((l.rot * Math.PI) / 180);

  if (l.type === 'img') {
    const w = l.w0 * l.s;
    const h = l.h0 * l.s;
    if (imgElem) {
      ctx.drawImage(imgElem, -w / 2, -h / 2, w, h);
    }
  } else {
    ctx.font = fontStr(l);
    ctx.fillStyle = l.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.text, 0, 0);
  }
  ctx.restore();
}

export function drawBase(ctx: CanvasRenderingContext2D, baseImg?: HTMLImageElement | null, isPhoto = false): void {
  ctx.fillStyle = '#ebe6dc';
  ctx.fillRect(0, 0, 600, 700);
  if (!baseImg) return;

  if (isPhoto) {
    const k = Math.min(600 / baseImg.width, 700 / baseImg.height);
    ctx.drawImage(
      baseImg,
      (600 - baseImg.width * k) / 2,
      (700 - baseImg.height * k) / 2,
      baseImg.width * k,
      baseImg.height * k
    );
  } else {
    ctx.drawImage(baseImg, 0, 0, 600, 700);
  }
}

export function exportMockup(
  layers: Layer[],
  area: PrintArea,
  baseImg?: HTMLImageElement | null,
  isPhoto = false,
  layerImages: Record<string, HTMLImageElement> = {}
): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = 700;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  drawBase(ctx, baseImg, isPhoto);

  // Clip to print area
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  for (const l of layers) {
    drawLayer(ctx, l, layerImages[l.id]);
  }
  ctx.restore();

  const thumb = document.createElement('canvas');
  thumb.width = 360;
  thumb.height = 420;
  const tCtx = thumb.getContext('2d');
  if (!tCtx) return '';
  tCtx.drawImage(c, 0, 0, 360, 420);
  return thumb.toDataURL('image/jpeg', 0.85);
}

export function exportDesign(
  layers: Layer[],
  area: PrintArea,
  layerImages: Record<string, HTMLImageElement> = {}
): string {
  if (typeof document === 'undefined' || !layers.length) return '';
  for (const scale of [3, 2, 1.5, 1]) {
    const c = document.createElement('canvas');
    c.width = Math.round(area.w * scale);
    c.height = Math.round(area.h * scale);
    const ctx = c.getContext('2d');
    if (!ctx) continue;

    ctx.scale(scale, scale);
    ctx.translate(-area.x, -area.y);
    for (const l of layers) {
      drawLayer(ctx, l, layerImages[l.id]);
    }
    const dataUrl = c.toDataURL('image/png');
    if (dataUrl.length <= 250000 || scale === 1) {
      return dataUrl;
    }
  }
  return '';
}

export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function shrinkImage(
  file: File,
  maxDim = 900,
  format: 'auto' | 'jpeg' | 'png' = 'auto'
): Promise<string> {
  const data = await readAsDataURL(file);
  const img = await loadImg(data);
  const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * sc));
  c.height = Math.max(1, Math.round(img.height * sc));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas context failed');
  ctx.drawImage(img, 0, 0, c.width, c.height);

  const useJpeg =
    format === 'jpeg' ||
    (format === 'auto' &&
      !file.type.includes('png') &&
      !file.type.includes('svg'));

  if (useJpeg) {
    return c.toDataURL('image/jpeg', 0.82);
  }
  return c.toDataURL('image/png');
}
