import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getOwnerProfileIds } from '@/lib/owner-ids';

export const revalidate = 60;

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const ownerIds = getOwnerProfileIds();

    // Fetch top 2 for each category to handle cascading (if #1 already has higher-priority title)
    const [streamerRes, gifterRes, referrerRes] = await Promise.all([
      admin.rpc('get_leaderboard', { p_type: 'top_streamers', p_period: 'alltime', p_limit: 2, p_room_id: null }),
      admin.rpc('get_leaderboard', { p_type: 'top_gifters', p_period: 'alltime', p_limit: 2, p_room_id: null }),
      (async () => {
        let q = admin.from('referral_rollups').select('referrer_profile_id')
          .order('activation_count', { ascending: false }).order('referral_count', { ascending: false }).limit(2);
        for (const id of ownerIds) q = q.neq('referrer_profile_id', id);
        return q;
      })(),
    ]);

    const streamers = (streamerRes.data || []).map((r: any) => r.profile_id);
    const gifters = (gifterRes.data || []).map((r: any) => r.profile_id);
    const referrers = (referrerRes.data || []).map((r: any) => r.referrer_profile_id);

    // Priority: streamer > gifter > referrer
    // Each person can only hold ONE title (highest priority)
    // If #1 in a category already has a higher title, give it to #2
    const assigned = new Set<string>();

    // Assign streamer first (highest priority)
    let topStreamer: string | null = null;
    for (const id of streamers) {
      if (id && !assigned.has(id)) {
        topStreamer = id;
        assigned.add(id);
        break;
      }
    }

    // Assign gifter (skip if they already have streamer title)
    let topGifter: string | null = null;
    for (const id of gifters) {
      if (id && !assigned.has(id)) {
        topGifter = id;
        assigned.add(id);
        break;
      }
    }

    // Assign referrer (skip if they already have streamer or gifter title)
    let topReferrer: string | null = null;
    for (const id of referrers) {
      if (id && !assigned.has(id)) {
        topReferrer = id;
        assigned.add(id);
        break;
      }
    }

    return NextResponse.json({
      top_streamer: topStreamer,
      top_gifter: topGifter,
      top_referrer: topReferrer,
    }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120' } });
  } catch (err) {
    console.error('GET /api/leaderboard-leaders error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
