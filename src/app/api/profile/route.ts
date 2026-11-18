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

    let query = admin.from('profiles').select('*');
    if (targetId) {
      query = query.eq('user_id', targetId);
    } else if (email) {
      query = query.eq('email', email);
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

    // 1. Resolve UUID for the profile
    let resolvedUserId: string | null = userId && isUuid(userId) ? userId : null;

    // Check current cookie session if no valid userId passed
    if (!resolvedUserId) {
      const serverClient = await createClientServer();
      if (serverClient) {
        const { data: { user } } = await serverClient.auth.getUser();
        if (user?.id) resolvedUserId = user.id;
      }
    }

    // If still no valid UUID, check if profile exists with this email
    if (!resolvedUserId && cleanEmail) {
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('user_id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingProfile?.user_id) {
        resolvedUserId = existingProfile.user_id;
      }
    }

    // If still no user_id, lookup or create auth user with this email
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

    // 2. Upsert into public.profiles table
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
      .upsert(profileRow)
      .select('*')
      .maybeSingle();

    if (upsertErr) {
      console.error('Profile upsert error:', upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
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
