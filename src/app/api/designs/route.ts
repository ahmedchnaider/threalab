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

  if (error) {
    return NextResponse.json({ designs: INITIAL_DESIGNS });
  }

  const dbDesigns = (data || []).map((row: any) => ({
    ...row.data,
    id: row.id,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  }));

  // Preserve initial default designs alongside custom uploaded ones
  const customIds = new Set(dbDesigns.map((d: any) => d.id));
  const remainingInitial = INITIAL_DESIGNS.filter((d) => !customIds.has(d.id));

  const allDesigns = [...dbDesigns, ...remainingInitial];
  return NextResponse.json({ designs: allDesigns });
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

    // Format created_at properly as ISO 8601 for PostgreSQL TIMESTAMPTZ
    const createdAtDate = rest.createdAt
      ? new Date(Number(rest.createdAt)).toISOString()
      : new Date().toISOString();

    const { error } = await admin.from('designs').upsert({
      id,
      data: cleanDesign,
      created_at: createdAtDate,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Design upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ design: cleanDesign });
  } catch (error: any) {
    console.error('Design POST error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
