import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { uploadBase64Image } from '@/lib/storage-helper';
import { INITIAL_PRODUCTS } from '@/lib/mock-data';

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ products: INITIAL_PRODUCTS });
  }

  const { data, error } = await admin
    .from('products')
    .select('*')
    .order('sort', { ascending: true });

  if (error || !data?.length) {
    return NextResponse.json({ products: INITIAL_PRODUCTS });
  }

  const products = data.map((row: any) => ({
    ...row.data,
    id: row.id,
  }));

  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { id, ...rest } = body;

    if (!id || !rest.name) {
      return NextResponse.json({ error: 'Missing product ID or name' }, { status: 400 });
    }

    // Upload photos to 'media' bucket if they are data URLs
    if (rest.photo?.startsWith('data:image/')) {
      rest.photo = await uploadBase64Image('media', `products/${id}/front.jpg`, rest.photo);
    }
    if (rest.photoBack?.startsWith('data:image/')) {
      rest.photoBack = await uploadBase64Image('media', `products/${id}/back.jpg`, rest.photoBack);
    }

    // Upload color-specific photos if present
    if (rest.colorPhotos && typeof rest.colorPhotos === 'object') {
      const updatedColorPhotos: Record<string, string> = {};
      for (const [key, val] of Object.entries(rest.colorPhotos)) {
        if (typeof val === 'string' && val.startsWith('data:image/')) {
          const uploadedUrl = await uploadBase64Image('media', `products/${id}/${key}.jpg`, val);
          updatedColorPhotos[key] = uploadedUrl;
        } else if (typeof val === 'string' && val) {
          updatedColorPhotos[key] = val;
        }
      }
      rest.colorPhotos = updatedColorPhotos;
    }

    const cleanProduct = {
      id,
      ...rest,
    };

    const { error } = await admin.from('products').upsert({
      id,
      data: cleanProduct,
      sort: cleanProduct.order || 0,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: cleanProduct });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
