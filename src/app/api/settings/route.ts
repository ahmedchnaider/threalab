import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { INITIAL_SETTINGS } from '@/lib/mock-data';

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ settings: INITIAL_SETTINGS });
  }

  const { data, error } = await admin
    .from('settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data?.data) {
    return NextResponse.json({ settings: INITIAL_SETTINGS });
  }

  return NextResponse.json({ settings: data.data });
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { name = 'THREADLAB', currency = 'TND', tagline = '' } = body;

    const cleanSettings = {
      name: String(name).trim() || 'THREADLAB',
      currency: String(currency).trim() || 'TND',
      tagline: String(tagline).trim(),
    };

    const { error } = await admin.from('settings').upsert({
      id: 1,
      data: cleanSettings,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: cleanSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
