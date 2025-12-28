import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('u');
    const username = typeof raw === 'string' ? raw.trim() : '';

    if (!username) {
      return NextResponse.json({ error: 'u is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, username')
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to resolve username' }, { status: 500 });
    }

    if (!profile?.id || !profile?.username) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        profile_id: String(profile.id),
        username: String(profile.username),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('GET /api/resolve/username error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
