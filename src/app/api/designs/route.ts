import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { uploadBase64Image } from '@/lib/storage-helper';
import { INITIAL_DESIGNS } from '@/lib/mock-data';

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ designs: INITIAL_DESIGNS });
  }

  const { data, error } = await admin
    .from('designs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    return NextResponse.json({ designs: INITIAL_DESIGNS });
  }

  const designs = data.map((row: any) => ({
    ...row.data,
    id: row.id,
  }));

  return NextResponse.json({ designs });
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
      return NextResponse.json({ error: 'Missing design ID or name' }, { status: 400 });
    }

    // Upload image to 'media' bucket if data URL
    if (rest.image?.startsWith('data:image/')) {
      rest.image = await uploadBase64Image('media', `designs/${id}.png`, rest.image);
    }

    const cleanDesign = {
      id,
      ...rest,
    };

    const { error } = await admin.from('designs').upsert({
      id,
      data: cleanDesign,
      created_at: rest.createdAt || Date.now(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ design: cleanDesign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
