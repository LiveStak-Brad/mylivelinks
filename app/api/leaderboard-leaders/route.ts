import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getOwnerProfileIds } from '@/lib/owner-ids';

export const revalidate = 60;

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const ownerIds = getOwnerProfileIds();

    const [streamerRes, gifterRes, referrerRes] = await Promise.all([
      admin.rpc('get_leaderboard', { p_type: 'top_streamers', p_period: 'alltime', p_limit: 1, p_room_id: null }),
      admin.rpc('get_leaderboard', { p_type: 'top_gifters', p_period: 'alltime', p_limit: 1, p_room_id: null }),
      (async () => {
        let q = admin.from('referral_rollups').select('referrer_profile_id')
          .order('activation_count', { ascending: false }).order('referral_count', { ascending: false }).limit(1);
        for (const id of ownerIds) q = q.neq('referrer_profile_id', id);
        return q;
      })(),
    ]);

    return NextResponse.json({
      top_streamer: streamerRes.data?.[0]?.profile_id || null,
      top_gifter: gifterRes.data?.[0]?.profile_id || null,
      top_referrer: referrerRes.data?.[0]?.referrer_profile_id || null,
    }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120' } });
  } catch (err) {
    console.error('GET /api/leaderboard-leaders error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
