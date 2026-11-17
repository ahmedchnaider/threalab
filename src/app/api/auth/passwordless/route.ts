import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, phone, city, address } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Supabase server configuration is missing.' },
        { status: 500 }
      );
    }

    // Generate magiclink using admin client (bypasses Supabase free SMTP rate limit)
    const linkRes = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: {
        data: {
          name: name || cleanEmail.split('@')[0],
          phone: phone || '',
          city: city || '',
          address: address || '',
        },
      },
    });

    if (linkRes.error || !linkRes.data?.properties?.hashed_token) {
      return NextResponse.json(
        { error: linkRes.error?.message || 'Failed to generate authentication token.' },
        { status: 400 }
      );
    }

    const { hashed_token, verification_type, email_otp } = linkRes.data.properties;
    const userId = linkRes.data.user?.id;

    // Ensure customer profile row exists in public.profiles table
    if (userId) {
      await admin.from('profiles').upsert({
        user_id: userId,
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        phone: phone || '',
        city: city || '',
        address: address || '',
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      token_hash: hashed_token,
      verification_type: verification_type || 'magiclink',
      otp: email_otp,
      userId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Authentication error' },
      { status: 500 }
    );
  }
}
