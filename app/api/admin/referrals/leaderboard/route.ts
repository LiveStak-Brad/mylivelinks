import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const range = (url.searchParams.get('range') || 'all').trim().toLowerCase();
    if (range !== 'all') {
      return NextResponse.json({ error: 'range must be all' }, { status: 400 });
    }

    const limitRaw = parseInt(url.searchParams.get('limit') || '100', 10);
    const limit = Math.min(Math.max(limitRaw || 100, 1), 100);

    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from('referral_rollups')
      .select('referrer_profile_id, click_count, referral_count, activation_count, last_click_at, last_referral_at, last_activity_at, profiles!referral_rollups_referrer_profile_id_fkey(username, avatar_url, display_name)')
      .order('activation_count', { ascending: false })
      .order('referral_count', { ascending: false })
      .order('click_count', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = Array.isArray(data) ? data : [];

    const referrerIds = rows
      .map((r: any) => String(r?.referrer_profile_id ?? '').trim())
      .filter(Boolean);

    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const windowCounts = new Map<
      string,
      { joined_7d: number; joined_30d: number; active_7d: number; active_30d: number }
    >();

    if (referrerIds.length) {
      const { data: referralRows, error: referralErr } = await admin
        .from('referrals')
        .select('referrer_profile_id, claimed_at, activated_at')
        .in('referrer_profile_id', referrerIds)
        .gte('claimed_at', since30)
        .limit(100000);

      if (referralErr) return NextResponse.json({ error: referralErr.message }, { status: 500 });

      for (const rr of Array.isArray(referralRows) ? referralRows : []) {
        const rid = String((rr as any)?.referrer_profile_id ?? '').trim();
        if (!rid) continue;

        const claimedAt = (rr as any)?.claimed_at ? String((rr as any).claimed_at) : null;
        const activatedAt = (rr as any)?.activated_at ? String((rr as any).activated_at) : null;

        const bucket = windowCounts.get(rid) ?? { joined_7d: 0, joined_30d: 0, active_7d: 0, active_30d: 0 };

        if (claimedAt) {
          bucket.joined_30d += 1;
          if (claimedAt >= since7) bucket.joined_7d += 1;
        }

        if (activatedAt) {
          bucket.active_30d += 1;
          if (activatedAt >= since7) bucket.active_7d += 1;
        }

        windowCounts.set(rid, bucket);
      }
    }

    const leaderboard = rows.map((r: any, idx: number) => ({
      profile_id: String(r?.referrer_profile_id ?? ''),
      username: r?.profiles?.username ?? null,
      avatar_url: r?.profiles?.avatar_url ?? null,
      display_name: r?.profiles?.display_name ?? null,
      clicks: Number(r?.click_count ?? 0),
      joined: Number(r?.referral_count ?? 0),
      active: Number(r?.activation_count ?? 0),
      joined_7d: Number(windowCounts.get(String(r?.referrer_profile_id ?? ''))?.joined_7d ?? 0),
      joined_30d: Number(windowCounts.get(String(r?.referrer_profile_id ?? ''))?.joined_30d ?? 0),
      active_7d: Number(windowCounts.get(String(r?.referrer_profile_id ?? ''))?.active_7d ?? 0),
      active_30d: Number(windowCounts.get(String(r?.referrer_profile_id ?? ''))?.active_30d ?? 0),
      last_click_at: r?.last_click_at ?? null,
      last_referral_at: r?.last_referral_at ?? null,
      last_activity_at: r?.last_activity_at ?? null,
      rank: idx + 1,
    }));

    return NextResponse.json(leaderboard, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
