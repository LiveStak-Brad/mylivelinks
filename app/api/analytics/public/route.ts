import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getGifterStatus } from '@/lib/gifter-status';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    const url = new URL(request.url);
    const profileId = url.searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, total_gifts_received, follower_count, total_spent')
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const status = getGifterStatus(Number((profile as any).total_spent ?? 0), { is_admin: false });

    return NextResponse.json({
      username: (profile as any).username,
      avatar: (profile as any).avatar_url,
      tier_badge: {
        tier_key: status.tier_key,
        tier_name: status.tier_name,
        is_diamond: status.is_diamond,
        level_in_tier: status.level_in_tier,
      },
      total_gifts_received: Number((profile as any).total_gifts_received ?? 0),
      followers_count: Number((profile as any).follower_count ?? 0),
    });
  } catch (err) {
    console.error('GET /api/analytics/public error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
