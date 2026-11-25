import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { uploadBase64Image } from '@/lib/storage-helper';
import { INITIAL_COLLECTIONS, newId } from '@/lib/mock-data';
import { Collection, CollectionImage } from '@/lib/types';

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ collections: INITIAL_COLLECTIONS });
  }

  try {
    const { data, error } = await admin
      .from('settings')
      .select('data')
      .eq('id', 2)
      .maybeSingle();

    if (error || !data?.data?.collections) {
      return NextResponse.json({ collections: INITIAL_COLLECTIONS });
    }

    return NextResponse.json({ collections: data.data.collections });
  } catch (err: any) {
    return NextResponse.json({ collections: INITIAL_COLLECTIONS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const collectionData: Collection = body.collection || body;

    const id = collectionData.id || newId();
    const name = (collectionData.name || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    // Process and upload any base64 images in the collection
    const processedImages: CollectionImage[] = [];
    const rawImages = Array.isArray(collectionData.images) ? collectionData.images : [];

    for (let i = 0; i < rawImages.length; i++) {
      const img = rawImages[i];
      const imgId = img.id || newId();
      let url = img.url;

      if (url?.startsWith('data:image/')) {
        url = await uploadBase64Image('media', `collections/${id}/${imgId}.jpg`, url);
      }

      processedImages.push({
        id: imgId,
        url,
        caption: img.caption || '',
        order: img.order !== undefined ? img.order : i,
      });
    }

    // Cover image
    let coverImage = collectionData.coverImage;
    if (coverImage?.startsWith('data:image/')) {
      coverImage = await uploadBase64Image('media', `collections/${id}/cover.jpg`, coverImage);
    } else if (!coverImage && processedImages.length > 0) {
      coverImage = processedImages[0].url;
    }

    const cleanCollection: Collection = {
      id,
      name,
      description: (collectionData.description || '').trim(),
      coverImage: coverImage || '',
      images: processedImages,
      active: collectionData.active !== undefined ? Boolean(collectionData.active) : true,
      order: typeof collectionData.order === 'number' ? collectionData.order : 0,
      createdAt: collectionData.createdAt || Date.now(),
    };

    if (admin) {
      // Fetch existing collections from settings id: 2
      const { data: existingData } = await admin
        .from('settings')
        .select('data')
        .eq('id', 2)
        .maybeSingle();

      let currentCollections: Collection[] = existingData?.data?.collections;
      if (!Array.isArray(currentCollections)) {
        currentCollections = [...INITIAL_COLLECTIONS];
      }

      const existingIndex = currentCollections.findIndex((c) => c.id === id);
      if (existingIndex >= 0) {
        currentCollections[existingIndex] = cleanCollection;
      } else {
        currentCollections.unshift(cleanCollection);
      }

      const { error: upsertErr } = await admin.from('settings').upsert({
        id: 2,
        data: { collections: currentCollections },
        updated_at: new Date().toISOString(),
      });

      if (upsertErr) {
        console.error('Settings table upsert error:', upsertErr);
        throw new Error(upsertErr.message || 'Database update failed');
      }
    }

    return NextResponse.json({ success: true, collection: cleanCollection });
  } catch (error: any) {
    console.error('Collection save error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
