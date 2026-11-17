import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Remove media files
  const prefix = `products/${id}`;
  const { data: files } = await admin.storage.from('media').list(prefix);
  if (files?.length) {
    await admin.storage.from('media').remove(files.map((f) => `${prefix}/${f.name}`));
  }

  const { error } = await admin.from('products').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
