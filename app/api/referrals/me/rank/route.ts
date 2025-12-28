import { NextRequest, NextResponse } from 'next/server';

import { requireUser } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    const admin = getSupabaseAdmin();

    const { data: rollup, error: rollupErr } = await admin
      .from('referral_rollups')
      .select('activation_count, referral_count, click_count')
      .eq('referrer_profile_id', user.id)
      .maybeSingle();

    const { count: totalReferrers, error: countErr } = await admin
      .from('referral_rollups')
      .select('referrer_profile_id', { count: 'exact', head: true });

    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

    if (rollupErr) return NextResponse.json({ error: rollupErr.message }, { status: 500 });

    if (!rollup) {
      return NextResponse.json({ rank: null, total_referrers: Number(totalReferrers ?? 0) }, { status: 200 });
    }

    const a = Number((rollup as any).activation_count ?? 0);
    const r = Number((rollup as any).referral_count ?? 0);
    const c = Number((rollup as any).click_count ?? 0);

    const orFilter = [
      `activation_count.gt.${a}`,
      `and(activation_count.eq.${a},referral_count.gt.${r})`,
      `and(activation_count.eq.${a},referral_count.eq.${r},click_count.gt.${c})`,
      `and(activation_count.eq.${a},referral_count.eq.${r},click_count.eq.${c},referrer_profile_id.lt.${user.id})`,
    ].join(',');

    const { count: aheadCount, error: aheadErr } = await admin
      .from('referral_rollups')
      .select('referrer_profile_id', { count: 'exact', head: true })
      .or(orFilter);

    if (aheadErr) return NextResponse.json({ error: aheadErr.message }, { status: 500 });

    const rank = Number(aheadCount ?? 0) + 1;

    return NextResponse.json(
      {
        rank,
        total_referrers: Number(totalReferrers ?? 0),
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('GET /api/referrals/me/rank error:', err);
    return NextResponse.json({ error: 'Failed to load referral rank' }, { status: 500 });
  }
}
