import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClientServer } from '@/lib/supabase-server';
import { uploadBase64Image, resolveOrderMediaUrl } from '@/lib/storage-helper';
import { newId } from '@/lib/mock-data';

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(request: NextRequest) {
  const supabase = await createClientServer();
  const admin = createAdminClient();

  if (!supabase || !admin) {
    return NextResponse.json({ orders: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if admin
  let isAdmin = false;
  if (user) {
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    isAdmin = Boolean(profile?.is_admin);
  }

  // If customer is logged in and not admin, return only their orders; otherwise return all store orders
  let query = admin.from('orders').select('*').order('created_at', { ascending: false });
  if (user && !isAdmin) {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (data || []).map((row: any) => {
    const orderData = row.data || {};
    const orderItems = (orderData.orderItems || []).map((it: any) => ({
      ...it,
      mockup: resolveOrderMediaUrl(it.mockup),
      design: resolveOrderMediaUrl(it.design),
    }));

    return {
      ...orderData,
      id: row.id,
      uid: row.user_id,
      status: row.status,
      createdAt: Number(row.created_at),
      orderItems,
    };
  });

  return NextResponse.json({ orders: formatted });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, items, orderItems = [], total, currency = 'TND', uid } = body;

    if (!customer?.name || !customer?.phone || !items?.length) {
      return NextResponse.json(
        { error: 'Missing required customer details or items' },
        { status: 400 }
      );
    }

    const orderId = newId();
    const code = orderId.slice(-6).toUpperCase();
    const createdAt = Date.now();
    const resolvedUid = uid || 'guest';

    // Upload base64 mockups and artwork to Storage
    const processedOrderItems: any[] = [];
    for (const item of orderItems) {
      let mockupUrl = item.mockup;
      let designUrl = item.design;

      if (mockupUrl?.startsWith('data:image/')) {
        mockupUrl = await uploadBase64Image(
          'orders',
          `${resolvedUid}/${orderId}/${item._id || newId()}-mockup.jpg`,
          mockupUrl
        );
      }

      if (designUrl?.startsWith('data:image/')) {
        designUrl = await uploadBase64Image(
          'orders',
          `${resolvedUid}/${orderId}/${item._id || newId()}-design.png`,
          designUrl
        );
      }

      processedOrderItems.push({
        ...item,
        mockup: mockupUrl,
        design: designUrl,
      });
    }

    const newOrder = {
      id: orderId,
      code,
      uid: uid || null,
      status: 'new',
      createdAt,
      total,
      currency,
      customer,
      items,
      orderItems: processedOrderItems,
    };

    const admin = createAdminClient();
    if (admin) {
      // 1. Insert order record
      const { error: orderErr } = await admin.from('orders').insert({
        id: orderId,
        user_id: uid || null,
        status: 'new',
        created_at: createdAt,
        data: newOrder,
      });

      if (orderErr) {
        console.error('Order insert error:', orderErr);
      }

      // 2. Insert individual order items
      if (processedOrderItems.length) {
        const itemRows = processedOrderItems.map((it: any) => ({
          id: `${orderId}-${it._id || newId()}`,
          order_id: orderId,
          user_id: uid || null,
          data: it,
        }));
        await admin.from('order_items').insert(itemRows);
      }

      // 3. Upsert customer profile by email
      const customerEmail = (customer.email || '').trim().toLowerCase();
      if (customerEmail) {
        let profileUserId: string | null = uid && isUuid(uid) ? uid : null;

        // Lookup existing profile by email
        if (!profileUserId) {
          const { data: existingProfile } = await admin
            .from('profiles')
            .select('user_id')
            .ilike('email', customerEmail)
            .maybeSingle();

          if (existingProfile?.user_id) {
            profileUserId = existingProfile.user_id;
          }
        }

        // If no user_id, check auth.users or create user
        if (!profileUserId) {
          try {
            const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
            const matched = (usersData?.users || []).find(
              (u) => (u.email || '').toLowerCase() === customerEmail
            );
            if (matched?.id) {
              profileUserId = matched.id;
            } else {
              const { data: newUser } = await admin.auth.admin.createUser({
                email: customerEmail,
                email_confirm: true,
                user_metadata: { name: customer.name, phone: customer.phone },
              });
              if (newUser?.user?.id) {
                profileUserId = newUser.user.id;
              }
            }
          } catch {}
        }

        if (profileUserId) {
          await admin.from('profiles').upsert(
            {
              user_id: profileUserId,
              name: customer.name,
              email: customerEmail,
              phone: customer.phone || '',
              city: customer.city || '',
              address: customer.address || '',
              last_order_at: createdAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        }
      }
    }

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error('Error placing order:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
