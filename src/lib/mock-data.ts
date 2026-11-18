import { Design, Product, StoreSettings } from './types';
import { defaultArea } from './garments';

export const INITIAL_SETTINGS: StoreSettings = {
  name: 'THREADLAB',
  currency: 'TND',
  tagline: 'Pick a piece, drop in your artwork or words, and we print it just for you.',
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-tshirt-1',
    name: 'Classic Heavyweight Tee',
    type: 'tshirt',
    price: 45,
    printPrice: 15,
    colors: ['#ffffff', '#141414', '#e9e4d8', '#7d8b6a', '#1f2f52', '#ff4d1c'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: '100% premium combed ring-spun cotton. 240 GSM heavy jersey with relaxed streetwear fit.',
    hasBack: true,
    area: defaultArea('tshirt', 'front', false),
    areaBack: defaultArea('tshirt', 'back', false),
    active: true,
    order: 0,
  },
  {
    id: 'prod-hoodie-1',
    name: 'Oversized Fleece Hoodie',
    type: 'hoodie',
    price: 85,
    printPrice: 15,
    colors: ['#141414', '#e9e4d8', '#8a1c1c', '#1f2f52'],
    sizes: ['M', 'L', 'XL', 'XXL'],
    description: 'Double-layered hood, 380 GSM brushed fleece with ribbed cuffs and kangaroo pouch.',
    hasBack: true,
    area: defaultArea('hoodie', 'front', false),
    areaBack: defaultArea('hoodie', 'back', false),
    active: true,
    order: 1,
  },
  {
    id: 'prod-sweatshirt-1',
    name: 'Crewneck Sweatshirt',
    type: 'sweatshirt',
    price: 65,
    printPrice: 15,
    colors: ['#ffffff', '#141414', '#c8b89a', '#2f4a3a'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: 'Classic raglan sleeve crewneck. Ultra soft interior cotton blend with drop shoulders.',
    hasBack: true,
    area: defaultArea('sweatshirt', 'front', false),
    areaBack: defaultArea('sweatshirt', 'back', false),
    active: true,
    order: 2,
  },
  {
    id: 'prod-tote-1',
    name: 'Everyday Canvas Tote',
    type: 'tote',
    price: 30,
    printPrice: 10,
    colors: ['#e9e4d8', '#141414', '#7d8b6a'],
    sizes: ['One Size'],
    description: 'Heavy duty 12oz canvas tote with reinforced cross-stitched handles. Reusable and durable.',
    hasBack: false,
    area: defaultArea('tote', 'front', false),
    areaBack: defaultArea('tote', 'back', false),
    active: true,
    order: 3,
  },
];

export const INITIAL_DESIGNS: Design[] = [
  {
    id: 'des-1',
    name: 'Tunis Sunset Wave',
    category: 'Graphics',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="%23ff4d1c"/><path d="M20 120 Q60 80 100 120 T180 120 L180 190 L20 190 Z" fill="%23141414"/><circle cx="70" cy="65" r="22" fill="%23fffdf8"/></svg>',
    active: true,
    createdAt: Date.now() - 50000,
  },
  {
    id: 'des-2',
    name: 'Arabic Calligraphy (حريّة)',
    category: 'Arabic',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 100"><text x="120" y="65" font-size="44" font-family="sans-serif" font-weight="900" fill="%23141414" text-anchor="middle">حُـــرِّيَّـــة</text></svg>',
    active: true,
    createdAt: Date.now() - 40000,
  },
  {
    id: 'des-3',
    name: 'Stay Raw Box Logo',
    category: 'Typography',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 80"><rect width="260" height="80" rx="10" fill="%23141414"/><text x="130" y="52" font-size="34" font-family="Impact, sans-serif" font-weight="900" fill="%23ff4d1c" text-anchor="middle" letter-spacing="2">STAY RAW</text></svg>',
    active: true,
    createdAt: Date.now() - 30000,
  },
  {
    id: 'des-4',
    name: 'Club Cyber Skull',
    category: 'Graphics',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><polygon points="100,20 170,80 140,170 60,170 30,80" fill="%23141414"/><circle cx="75" cy="85" r="16" fill="%23fffdf8"/><circle cx="125" cy="85" r="16" fill="%23fffdf8"/><rect x="85" y="130" width="30" height="15" fill="%23ff4d1c"/></svg>',
    active: true,
    createdAt: Date.now() - 20000,
  },
  {
    id: 'des-5',
    name: 'Sidi Bou Said Mosaic',
    category: 'Arabic',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="10" y="10" width="180" height="180" rx="20" fill="%231f2f52"/><circle cx="100" cy="100" r="60" fill="none" stroke="%23fffdf8" stroke-width="8"/><rect x="75" y="75" width="50" height="50" transform="rotate(45 100 100)" fill="%23ff4d1c"/></svg>',
    active: true,
    createdAt: Date.now() - 10000,
  },
];

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
