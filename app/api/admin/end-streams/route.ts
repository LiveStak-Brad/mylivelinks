import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const ADMIN_API_KEY = process.env.ADMIN_API_KEY?.trim(); // optional override

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

    // If an admin API key is provided and matches, allow bypass (for emergency use)
    const adminKey = request.headers.get('x-admin-key')?.trim();
    const adminKeyValid = ADMIN_API_KEY && adminKey === ADMIN_API_KEY;

    // Verify user (if token present)
    let verifiedUserId: string | null = null;
    let verifiedEmail: string | null = null;

    if (tokenToUse) {
      const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${tokenToUse}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user) {
        verifiedUserId = userData.user.id;
        verifiedEmail = userData.user.email || null;
      }
    }

    // If no token and no valid admin API key -> unauthorized
    if (!verifiedUserId && !adminKeyValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to check allowlist (env + hardcoded + table)
    const serviceClient = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let allowlistMatch: boolean = false;
    const envIds = (process.env.NEXT_PUBLIC_ADMIN_PROFILE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const hardcodedIds = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
    const hardcodedEmails = ['wcba.mo@gmail.com'];

    if (verifiedUserId || verifiedEmail) {
      const userId = verifiedUserId || '';
      const userEmail = (verifiedEmail || '').toLowerCase();
      const idMatch: boolean = !!(userId && (envIds.includes(userId) || hardcodedIds.includes(userId)));
      const emailMatch: boolean = !!(userEmail && (envEmails.includes(userEmail) || hardcodedEmails.includes(userEmail)));
      allowlistMatch = idMatch || emailMatch;

      // Check admin_allowlist table if exists
      try {
        const { data: tableRow } = await serviceClient
          .from('admin_allowlist')
          .select('profile_id, email')
          .or(`profile_id.eq.${userId},email.eq.${userEmail}`)
          .limit(1)
          .single();
        if (tableRow) {
          allowlistMatch = true;
        }
      } catch (e) {
        // table may not exist; ignore
      }
    }

    if (!allowlistMatch && !adminKeyValid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

