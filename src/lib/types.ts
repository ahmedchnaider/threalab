export type GarmentType = 'tshirt' | 'hoodie' | 'sweatshirt' | 'tote';
export type Side = 'front' | 'back';

export interface PrintArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GarmentConfig {
  label: string;
  area: PrintArea;
  areaBack: PrintArea;
}

export interface BaseLayer {
  id: string;
  type: 'text' | 'img';
  s: number; // scale multiplier
  cx: number; // center x on canvas (0..600)
  cy: number; // center y on canvas (0..700)
  rot: number; // rotation in degrees
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  font: string;
  color: string;
  baseSize: number;
}

export interface ImageLayer extends BaseLayer {
  type: 'img';
  src: string;
  w0: number; // original natural width fitted
  h0: number; // original natural height fitted
  name: string;
  libId?: string | null;
}

export type Layer = TextLayer | ImageLayer;

export interface Product {
  id: string;
  name: string;
  type: GarmentType;
  price: number;
  printPrice: number;
  colors: string[];
  sizes: string[];
  description: string;
  photo?: string;
  photoBack?: string;
  hasBack: boolean;
  colorPhotos?: Record<string, string>; // key: `${hexClean}-${side}` => base64 dataUrl or storage URL
  area: PrintArea;
  areaBack: PrintArea;
  active: boolean;
  order: number;
}

export interface Design {
  id: string;
  name: string;
  category: string;
  image: string;
  active: boolean;
  createdAt: number;
}

export interface StoreSettings {
  name: string;
  currency: string;
  tagline: string;
}

export interface CartViewSide {
  side: Side;
  mockup: string;
  design: string;
}

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  type: GarmentType;
  color: string;
  size: string;
  qty: number;
  unit: number;
  hasDesign: boolean;
  printed: Side[];
  views: Record<Side, { mockup: string; design: string }>;
  library: string[];
  texts: string[];
}

export interface CustomerProfile {
  user_id?: string;
  is_admin?: boolean;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
  lastOrderAt?: number;
}

export type OrderStatus = 'new' | 'in production' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItemDetail {
  _id?: string;
  side: Side;
  name: string;
  color: string;
  size: string;
  qty: number;
  mockup: string;
  design: string;
}

export interface Order {
  id: string;
  code: string;
  uid?: string;
  status: OrderStatus;
  createdAt: number;
  total: number;
  currency: string;
  cancelledBy?: 'customer' | 'admin';
  customer: CustomerProfile;
  items: Array<{
    name: string;
    type: GarmentType;
    color: string;
    size: string;
    qty: number;
    unit: number;
    hasDesign: boolean;
    printed: Side[];
    texts?: string[];
    library?: string[];
  }>;
  orderItems?: OrderItemDetail[];
}

export interface LightboxItem {
  src: string;
  label: string;
  checker?: boolean;
}
