import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { Collection } from '@/lib/types';
import { INITIAL_COLLECTIONS } from '@/lib/mock-data';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json({ success: true, message: 'Deleted locally' });
  }

  try {
    // 1. Fetch current collections from settings id: 2
    const { data: existingData } = await admin
      .from('settings')
      .select('data')
      .eq('id', 2)
      .maybeSingle();

    let currentCollections: Collection[] = existingData?.data?.collections;
    if (!Array.isArray(currentCollections)) {
      currentCollections = [...INITIAL_COLLECTIONS];
    }

    // Filter out the deleted collection
    const updatedCollections = currentCollections.filter((c) => c.id !== id);

    await admin.from('settings').upsert({
      id: 2,
      data: { collections: updatedCollections },
      updated_at: new Date().toISOString(),
    });

    // 2. Remove files from storage media bucket under collections/${id}
    try {
      const { data: files } = await admin.storage.from('media').list(`collections/${id}`);
      if (files?.length) {
        await admin.storage
          .from('media')
          .remove(files.map((f) => `collections/${id}/${f.name}`));
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
