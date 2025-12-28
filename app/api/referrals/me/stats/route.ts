import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/rbac';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    const url = new URL(request.url);
    const range = (url.searchParams.get('range') || 'all').trim().toLowerCase();
    if (range !== 'all') {
      return NextResponse.json({ error: 'range must be all' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);

    const { data, error } = await supabase
      .from('referral_rollups')
      .select('click_count, referral_count, activation_count')
      .eq('referrer_profile_id', user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
      {
        clicks: Number(data?.click_count ?? 0),
        joined: Number(data?.referral_count ?? 0),
        active: Number(data?.activation_count ?? 0),
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/referrals/me/stats error:', err);
    return NextResponse.json({ error: 'Failed to load referral stats' }, { status: 500 });
  }
}
