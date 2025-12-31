import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const range = (url.searchParams.get('range') || 'all').trim().toLowerCase();
    
    const limitRaw = parseInt(url.searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(limitRaw || 50, 1), 100);

    const admin = getSupabaseAdmin();

    // Query referral_rollups directly like the admin panel does
    const { data, error } = await admin
      .from('referral_rollups')
      .select('referrer_profile_id, referral_count, activation_count, profiles!referral_rollups_referrer_profile_id_fkey(username, avatar_url, display_name)')
      .order('activation_count', { ascending: false })
      .order('referral_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('GET /api/referrals/leaderboard DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];

    const items = rows.map((r: any, idx: number) => ({
      profile_id: String(r?.referrer_profile_id ?? ''),
      username: r?.profiles?.username ?? null,
      avatar_url: r?.profiles?.avatar_url ?? null,
      joined: Number(r?.referral_count ?? 0),
      active: Number(r?.activation_count ?? 0),
      rank: idx + 1,
    }));

    const res = NextResponse.json(
      {
        range,
        items,
        next_cursor: null,
      },
      { status: 200 }
    );

    res.headers.set('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
    return res;
  } catch (err) {
    console.error('GET /api/referrals/leaderboard error:', err);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
