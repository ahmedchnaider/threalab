import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClientServer } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClientServer();
  const admin = createAdminClient();

  if (!supabase || !admin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Try calling the cancel_order RPC if configured
  const { data: rpcSuccess, error: rpcErr } = await supabase.rpc('cancel_order', { oid: id });
  if (!rpcErr && rpcSuccess) {
    return NextResponse.json({ success: true, status: 'cancelled' });
  }

  // Fallback: check order ownership and status manually
  const { data: order } = await admin.from('orders').select('*').eq('id', id).maybeSingle();
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'new') {
    return NextResponse.json(
      { error: 'Orders already in production cannot be cancelled online.' },
      { status: 400 }
    );
  }

  if (user && order.user_id && order.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized to cancel this order.' }, { status: 403 });
  }

  await admin
    .from('orders')
    .update({
      status: 'cancelled',
      data: {
        ...order.data,
        status: 'cancelled',
        cancelledBy: 'customer',
      },
    })
    .eq('id', id);

  return NextResponse.json({ success: true, status: 'cancelled' });
}
