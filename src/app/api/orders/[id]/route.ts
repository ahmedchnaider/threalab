import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getSignedMediaUrl } from '@/lib/storage-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: order, error } = await admin.from('orders').select('*').eq('id', id).maybeSingle();
  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Fetch items
  const { data: itemRows } = await admin.from('order_items').select('data').eq('order_id', id);
  const items = (itemRows || []).map((r: any) => ({ ...r.data }));

  // Generate signed URLs for private print artwork
  for (const it of items) {
    if (it.design?.startsWith('orders:')) {
      it.design = await getSignedMediaUrl('orders', it.design, 3600);
    }
    if (it.mockup?.startsWith('orders:')) {
      it.mockup = await getSignedMediaUrl('orders', it.mockup, 3600);
    }
  }

  return NextResponse.json({
    order: {
      ...order.data,
      id: order.id,
      status: order.status,
      createdAt: Number(order.created_at),
      orderItems: items,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { status } = body;

  const validStatuses = ['new', 'in production', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await admin.from('orders').update({ status }).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Get order user_id to clean up storage folder if exists
  const { data: order } = await admin.from('orders').select('user_id').eq('id', id).maybeSingle();
  if (order?.user_id) {
    const prefix = `${order.user_id}/${id}`;
    const { data: files } = await admin.storage.from('orders').list(prefix);
    if (files?.length) {
      await admin.storage.from('orders').remove(files.map((f) => `${prefix}/${f.name}`));
    }
  }

  // Delete related items first (safe even without ON DELETE CASCADE)
  await admin.from('order_items').delete().eq('order_id', id);

  const { error } = await admin.from('orders').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
