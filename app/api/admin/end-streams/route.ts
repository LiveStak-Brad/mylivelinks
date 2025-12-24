import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase environment variables missing' },
        { status: 500 }
      );
    }

    // Extract token from Authorization header or cookie (same pattern as LiveKit token route)
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '') || null;
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split('; ').filter(Boolean).map(c => c.split('=')));
    const cookieToken =
      cookies['sb-access-token'] ||
      cookies[`sb-${SUPABASE_URL.split('//')[1]?.split('.')[0]}-auth-token`] ||
      null;
    const tokenToUse = accessToken || cookieToken;

    if (!tokenToUse) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${tokenToUse}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin/owner by username (matches OptionsMenu logic)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    const username = (profile as any).username;
    const isAdmin = username === 'owner' || username === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role to end all streams
    const serviceClient = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date().toISOString();

    const { error: liveError } = await serviceClient
      .from('live_streams')
      .update({
        live_available: false,
        is_published: false,
        ended_at: now,
        unpublished_at: now,
      });

    if (liveError) {
      console.error('Error ending streams:', liveError);
      return NextResponse.json({ error: 'Failed to end live streams' }, { status: 500 });
    }

    const { error: viewersError } = await serviceClient.from('active_viewers').delete();
    if (viewersError) {
      console.error('Error clearing active_viewers:', viewersError);
      return NextResponse.json({ error: 'Failed to clear viewers' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ended_at: now });
  } catch (err: any) {
    console.error('end-streams error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

