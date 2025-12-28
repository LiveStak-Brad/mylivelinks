import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest, context: { params: { profile_id: string } }) {
  try {
    await requireAdmin(request);

    const profileId = String(context?.params?.profile_id ?? '').trim();
    if (!profileId) return NextResponse.json({ error: 'profile_id is required' }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: referrer, error: referrerErr } = await admin
      .from('profiles')
      .select('id, username, avatar_url, display_name')
      .eq('id', profileId)
      .maybeSingle();

    if (referrerErr) return NextResponse.json({ error: referrerErr.message }, { status: 500 });

    const { data: referrals, error } = await admin
      .from('referrals')
      .select('referred_profile_id, claimed_at')
      .eq('referrer_profile_id', profileId)
      .order('claimed_at', { ascending: false })
      .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const referredIds = Array.from(
      new Set((Array.isArray(referrals) ? referrals : []).map((r: any) => String(r?.referred_profile_id ?? '')).filter(Boolean))
    );

    const { data: profiles } = referredIds.length
      ? await admin.from('profiles').select('id, username, avatar_url, display_name').in('id', referredIds)
      : { data: [] as any[] };

    const profileById = new Map<string, any>();
    for (const p of Array.isArray(profiles) ? profiles : []) {
      if (p?.id) profileById.set(String(p.id), p);
    }

    const { data: activityRows } = referredIds.length
      ? await admin
          .from('referral_activity')
          .select('referred_profile_id, event_type, created_at')
          .in('referred_profile_id', referredIds)
          .order('created_at', { ascending: false })
      : { data: [] as any[] };

    const lastActivityByReferred = new Map<string, string>();
    const activatedByReferred = new Set<string>();

    for (const a of Array.isArray(activityRows) ? activityRows : []) {
      const rid = String(a?.referred_profile_id ?? '');
      if (!rid) continue;
      if (!lastActivityByReferred.has(rid) && a?.created_at) lastActivityByReferred.set(rid, String(a.created_at));
      if (String(a?.event_type ?? '').toLowerCase() === 'activated') activatedByReferred.add(rid);
    }

    const referred_users = (Array.isArray(referrals) ? referrals : []).map((r: any) => {
      const rid = String(r?.referred_profile_id ?? '');
      const p = profileById.get(rid);
      return {
        profile_id: rid,
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        display_name: p?.display_name ?? null,
        joined_at: r?.claimed_at ?? null,
        is_active: activatedByReferred.has(rid),
        last_activity_at: lastActivityByReferred.get(rid) ?? null,
      };
    });

    return NextResponse.json(
      {
        referrer: referrer ?? null,
        referred_users,
      },
      { status: 200 }
    );
  } catch (err) {
    return authErrorToResponse(err);
  }
}
