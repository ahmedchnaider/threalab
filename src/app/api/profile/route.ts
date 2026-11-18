import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClientServer } from '@/lib/supabase-server';

// Validate UUID format
function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const email = searchParams.get('email')?.trim().toLowerCase();
    const userId = searchParams.get('userId')?.trim();

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ profile: null, profiles: [] });
    }

    // Return all customer profiles for Admin Customers view
    if (all) {
      const { data, error } = await admin
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ profiles: data || [] });
    }

    // Resolve specific profile: by userId, by email, or from current auth session
    let targetId = userId && isUuid(userId) ? userId : null;

    if (!targetId) {
      const serverClient = await createClientServer();
      if (serverClient) {
        const { data: { user } } = await serverClient.auth.getUser();
        if (user?.id) targetId = user.id;
      }
    }

    // Return specific profile: prioritize email lookup
    let query = admin.from('profiles').select('*');
    if (email) {
      query = query.ilike('email', email);
    } else if (targetId) {
      query = query.eq('user_id', targetId);
    } else {
      return NextResponse.json({ profile: null });
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, email, phone, city, address } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanCity = (city || '').trim();
    const cleanAddress = (address || '').trim();

    if (!cleanName && !cleanEmail) {
      return NextResponse.json(
        { error: 'Name and email are required to save profile.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      // Local fallback without Supabase credentials
      return NextResponse.json({
        success: true,
        profile: {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          city: cleanCity,
          address: cleanAddress,
        },
      });
    }

    // 1. Prioritize lookup of existing profile by email
    let resolvedUserId: string | null = null;

    if (cleanEmail) {
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('user_id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingProfile?.user_id) {
        resolvedUserId = existingProfile.user_id;
      }
    }

    // 2. If not found by email, check passed userId or active server session
    if (!resolvedUserId) {
      if (userId && isUuid(userId)) {
        resolvedUserId = userId;
      } else {
        const serverClient = await createClientServer();
        if (serverClient) {
          const { data: { user } } = await serverClient.auth.getUser();
          if (user?.id) resolvedUserId = user.id;
        }
      }
    }

    // 3. If still no valid UUID, lookup or create auth user with this email
    if (!resolvedUserId && cleanEmail) {
      try {
        const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
        const matched = (usersData?.users || []).find(
          (u) => (u.email || '').toLowerCase() === cleanEmail
        );
        if (matched?.id) {
          resolvedUserId = matched.id;
        } else {
          // Create new auth user
          const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
            email: cleanEmail,
            email_confirm: true,
            user_metadata: { name: cleanName, phone: cleanPhone },
          });
          if (!createErr && newUser?.user?.id) {
            resolvedUserId = newUser.user.id;
          }
        }
      } catch {
        // Continue
      }
    }

    if (!resolvedUserId) {
      return NextResponse.json(
        { error: 'Could not resolve user ID for profile.' },
        { status: 400 }
      );
    }

    // 4. Upsert into public.profiles table by user_id
    const profileRow = {
      user_id: resolvedUserId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      city: cleanCity,
      address: cleanAddress,
      updated_at: new Date().toISOString(),
    };

    const { data: savedRow, error: upsertErr } = await admin
      .from('profiles')
      .upsert(profileRow, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();

    if (upsertErr) {
      console.error('Profile upsert error:', upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    // 5. Sync updated customer details across existing orders for this customer
    if (cleanEmail) {
      try {
        const { data: userOrders } = await admin
          .from('orders')
          .select('id, data')
          .eq('user_id', resolvedUserId);

        for (const ord of userOrders || []) {
          const ordData = ord.data || {};
          const currentCust = ordData.customer || {};
          const updatedCust = {
            ...currentCust,
            name: cleanName || currentCust.name,
            phone: cleanPhone || currentCust.phone,
            city: cleanCity || currentCust.city,
            address: cleanAddress || currentCust.address,
            email: cleanEmail,
          };
          await admin
            .from('orders')
            .update({ data: { ...ordData, customer: updatedCust } })
            .eq('id', ord.id);
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      profile: savedRow || profileRow,
    });
  } catch (error: any) {
    console.error('Profile route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save customer profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();
    const userId = searchParams.get('userId')?.trim();
    const phone = searchParams.get('phone')?.trim();

    if (!email && !userId && !phone) {
      return NextResponse.json(
        { error: 'Email, userId, or phone is required to delete customer account' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ success: true, message: 'Deleted locally' });
    }

    let resolvedUserId: string | null = userId && isUuid(userId) ? userId : null;

    // 1. If no userId, find profile or user by email
    if (!resolvedUserId && email) {
      const { data: profile } = await admin
        .from('profiles')
        .select('user_id')
        .ilike('email', email)
        .maybeSingle();

      if (profile?.user_id) {
        resolvedUserId = profile.user_id;
      }
    }

    // 2. If still not resolved, search in auth.users
    if (!resolvedUserId && email) {
      try {
        const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
        const matched = (usersData?.users || []).find(
          (u) => (u.email || '').toLowerCase() === email
        );
        if (matched?.id) {
          resolvedUserId = matched.id;
        }
      } catch {}
    }

    // 3. If still not resolved and phone provided, search by phone in profiles
    if (!resolvedUserId && phone) {
      try {
        const { data: profileByPhone } = await admin
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .maybeSingle();

        if (profileByPhone?.user_id) {
          resolvedUserId = profileByPhone.user_id;
        }
      } catch {}
    }

    // 4. Delete from public.profiles
    if (resolvedUserId) {
      await admin.from('profiles').delete().eq('user_id', resolvedUserId);
    }
    if (email) {
      await admin.from('profiles').delete().ilike('email', email);
    }
    if (phone) {
      await admin.from('profiles').delete().eq('phone', phone);
    }

    // 5. Detach user_id on existing orders so customer orders are preserved
    if (resolvedUserId) {
      try {
        await admin.from('orders').update({ user_id: null }).eq('user_id', resolvedUserId);
        await admin.from('order_items').update({ user_id: null }).eq('user_id', resolvedUserId);
      } catch {}
    }

    // 6. Delete auth user from auth.users (so customer cannot log back in)
    if (resolvedUserId) {
      try {
        await admin.auth.admin.deleteUser(resolvedUserId);
      } catch (err: any) {
        console.warn('Could not delete from auth.users:', err?.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Customer account successfully deleted. Orders preserved.',
      deletedUserId: resolvedUserId,
      deletedEmail: email,
    });
  } catch (error: any) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer account' },
      { status: 500 }
    );
  }
}
