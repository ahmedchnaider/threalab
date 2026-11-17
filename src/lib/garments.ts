import { GarmentConfig, GarmentType, PrintArea, Side } from './types';

export const GARMENTS: Record<GarmentType, GarmentConfig> = {
  tshirt: {
    label: 'T-shirt',
    area: { x: 205, y: 165, w: 190, h: 250 },
    areaBack: { x: 205, y: 120, w: 190, h: 290 },
  },
  hoodie: {
    label: 'Hoodie',
    area: { x: 205, y: 200, w: 190, h: 235 },
    areaBack: { x: 200, y: 215, w: 200, h: 250 },
  },
  sweatshirt: {
    label: 'Sweatshirt',
    area: { x: 200, y: 170, w: 200, h: 270 },
    areaBack: { x: 200, y: 135, w: 200, h: 300 },
  },
  tote: {
    label: 'Tote bag',
    area: { x: 165, y: 280, w: 270, h: 300 },
    areaBack: { x: 165, y: 280, w: 270, h: 300 },
  },
};

export const HEX_REGEX = /^#[0-9a-f]{6}$/i;

export function shade(hex: string, p: number): string {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = parseInt(cleanHex, 16);
  const r = n >> 16;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const t = p < 0 ? 0 : 255;
  const f = Math.abs(p);
  return `rgb(${Math.round((t - r) * f + r)},${Math.round((t - g) * f + g)},${Math.round((t - b) * f + b)})`;
}

export function lum(hex: string): number {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = parseInt(cleanHex, 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export function garmentSVG(type: GarmentType, c: string, side: Side = 'front'): string {
  const color = HEX_REGEX.test(c) ? c : '#ffffff';
  const back = side === 'back';
  const dark = lum(color) < 0.28;
  const s = dark ? shade(color, 0.22) : shade(color, -0.32); // seam/outline
  const d2 = dark ? shade(color, 0.1) : shade(color, -0.14); // inner tone
  const grad = `<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient><linearGradient id="v" y1="0" y2="1" x1="0" x2="0"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient></defs>`;
  const body = (d: string) =>
    `<path d="${d}" fill="${color}" stroke="${s}" stroke-width="3" stroke-linejoin="round"/><path d="${d}" fill="url(#g)"/><path d="${d}" fill="url(#v)"/>`;

  let inner = '';
  if (type === 'tshirt') {
    const d =
      'M150 90 L235 60 Q300 105 365 60 L450 90 L560 190 L490 270 L445 235 L445 640 Q300 660 155 640 L155 235 L110 270 L40 190 Z';
    inner =
      body(d) +
      (back
        ? `<path d="M235 60 Q300 82 365 60" fill="none" stroke="${s}" stroke-width="3"/><path d="M232 66 Q300 92 368 66" fill="none" stroke="${s}" stroke-width="2" opacity=".45"/>`
        : `<path d="M235 60 Q300 128 365 60 Q300 100 235 60Z" fill="${d2}" stroke="${s}" stroke-width="3"/><path d="M228 62 Q300 140 372 62" fill="none" stroke="${s}" stroke-width="2" opacity=".5"/>`) +
      `<path d="M155 235 L176 84 M445 235 L424 84" stroke="${s}" stroke-width="2" fill="none" opacity=".45"/>` +
      `<path d="M115 262 L45 196 M485 262 L555 196" stroke="${s}" stroke-width="2" fill="none" opacity=".35" stroke-dasharray="5 5"/>`;
  } else if (type === 'hoodie' || type === 'sweatshirt') {
    const d =
      'M165 120 L235 95 Q300 120 365 95 L435 120 Q505 140 530 250 L565 560 Q535 580 500 572 L460 330 L455 620 L460 650 Q300 668 140 650 L145 620 L140 330 L100 572 Q65 580 35 560 L70 250 Q95 140 165 120 Z';
    const common =
      `<path d="M143 618 Q300 636 457 618" fill="none" stroke="${s}" stroke-width="2.5" opacity=".5"/>` +
      `<path d="M108 548 L36 538 M492 548 L564 538" stroke="${s}" stroke-width="2.5" opacity=".5"/>` +
      `<path d="M140 330 L165 120 M460 330 L435 120" stroke="${s}" stroke-width="2" fill="none" opacity=".4"/>`;

    if (type === 'hoodie' && back) {
      inner =
        body(d) +
        common +
        `<path d="M212 104 Q205 22 300 16 Q395 22 388 104 Q384 196 300 206 Q216 196 212 104 Z" fill="${d2}" stroke="${s}" stroke-width="3"/>` +
        `<path d="M300 18 L300 204" stroke="${s}" stroke-width="2" opacity=".45"/>`;
    } else if (type === 'hoodie') {
      inner =
        `<path d="M212 112 Q205 28 300 22 Q395 28 388 112 Q300 150 212 112 Z" fill="${d2}" stroke="${s}" stroke-width="3"/>` +
        body(d) +
        common +
        `<path d="M240 100 Q300 172 360 100 Q300 128 240 100 Z" fill="${shade(color, dark ? 0.04 : -0.3)}" stroke="${s}" stroke-width="3"/>` +
        `<path d="M282 136 L279 188 M318 136 L321 188" stroke="${s}" stroke-width="4" stroke-linecap="round"/>` +
        `<circle cx="279" cy="192" r="5" fill="${s}"/><circle cx="321" cy="192" r="5" fill="${s}"/>` +
        `<path d="M212 468 L388 468 L414 592 L186 592 Z" fill="none" stroke="${s}" stroke-width="2.5" opacity=".55"/>`;
    } else {
      inner =
        body(d) +
        common +
        (back
          ? `<path d="M232 96 Q300 116 368 96" fill="none" stroke="${s}" stroke-width="10" opacity=".3"/><path d="M232 96 Q300 116 368 96" fill="none" stroke="${s}" stroke-width="3"/>`
          : `<path d="M232 96 Q300 150 368 96" fill="none" stroke="${s}" stroke-width="12" opacity=".35"/><path d="M232 96 Q300 150 368 96 Q300 120 232 96Z" fill="${d2}" stroke="${s}" stroke-width="3"/>`);
    }
  } else {
    // tote
    inner =
      `<path d="M205 220 Q205 70 300 70 Q395 70 395 220" fill="none" stroke="${shade(color, dark ? 0.12 : -0.18)}" stroke-width="24" stroke-linecap="round"/>` +
      body('M118 210 L482 210 L490 645 Q300 655 110 645 Z') +
      `<path d="M120 240 L480 240" stroke="${s}" stroke-width="2" stroke-dasharray="6 6" opacity=".5"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700" width="600" height="700">${grad}${inner}</svg>`;
}

export function svgURL(type: GarmentType, color: string, side: Side = 'front'): string {
  const gType = GARMENTS[type] ? type : 'tshirt';
  const c = HEX_REGEX.test(color) ? color : '#ffffff';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(garmentSVG(gType, c, side));
}

export function defaultArea(type: GarmentType, side: Side, hasPhoto: boolean): PrintArea {
  if (hasPhoto) {
    return side === 'back'
      ? { x: 170, y: 170, w: 260, h: 340 }
      : { x: 170, y: 190, w: 260, h: 320 };
  }
  const g = GARMENTS[type] || GARMENTS.tshirt;
  return { ...(side === 'back' ? g.areaBack : g.area) };
}

export function clampArea(a: Partial<PrintArea> | undefined, def: PrintArea): PrintArea {
  if (!a || typeof a !== 'object') return { ...def };
  let x = +(a.x ?? def.x);
  let y = +(a.y ?? def.y);
  let w = +(a.w ?? def.w);
  let h = +(a.h ?? def.h);
  if (![x, y, w, h].every(Number.isFinite)) return { ...def };
  w = Math.min(600, Math.max(30, w));
  h = Math.min(700, Math.max(30, h));
  x = Math.min(600 - w, Math.max(0, x));
  y = Math.min(700 - h, Math.max(0, y));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}
