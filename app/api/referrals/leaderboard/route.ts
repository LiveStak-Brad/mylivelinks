import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const range = (url.searchParams.get('range') || 'all').trim().toLowerCase();
    if (range !== 'all') {
      return NextResponse.json({ error: 'range must be all' }, { status: 400 });
    }

    const limitRaw = parseInt(url.searchParams.get('limit') || '100', 10);
    const limit = limitRaw === 5 || limitRaw === 100 ? limitRaw : 100;

    const admin = getSupabaseAdmin();

    const { count: totalReferrers, error: countError } = await admin
      .from('referral_rollups')
      .select('referrer_profile_id', { count: 'exact', head: true });

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

    const { data, error } = await admin
      .from('referral_rollups')
      .select('referrer_profile_id, click_count, referral_count, activation_count, profiles!referral_rollups_referrer_profile_id_fkey(username, avatar_url)')
      .order('activation_count', { ascending: false })
      .order('referral_count', { ascending: false })
      .order('click_count', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = Array.isArray(data) ? data : [];

    const leaderboard = rows.map((r: any, idx: number) => ({
      profile_id: String(r?.referrer_profile_id ?? ''),
      username: r?.profiles?.username ?? null,
      avatar_url: r?.profiles?.avatar_url ?? null,
      joined: Number(r?.referral_count ?? 0),
      active: Number(r?.activation_count ?? 0),
      rank: idx + 1,
      total_referrers: Number(totalReferrers ?? 0),
    }));

    return NextResponse.json(leaderboard, { status: 200 });
  } catch (err) {
    console.error('GET /api/referrals/leaderboard error:', err);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
