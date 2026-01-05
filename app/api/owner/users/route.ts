import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const q = (url.searchParams.get('q') || '').trim();

    const admin = getSupabaseAdmin();

    const nowIso = new Date().toISOString();

    const isMissingColumnError = (err: any) => {
      const code = typeof err?.code === 'string' ? err.code : '';
      const msg = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
      return code === '42703' || msg.includes('column') || msg.includes('does not exist');
    };

    const applySearch = (query: any) => {
      if (q) {
        const escaped = q.replace(/,/g, '');
        return query.or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`);
      }
      return query;
    };

    const queryWithLiveAccess = applySearch(
      admin
        .from('profiles')
        .select('*, live_access_grants(profile_id), user_sanctions(banned_until)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    const { data: data1, count: total1, error: err1 } = await queryWithLiveAccess;

    const countTotal = async () => {
      const { count } = await applySearch(admin.from('profiles').select('id', { count: 'exact', head: true }));
      return count ?? 0;
    };

    const countVerified = async () => {
      const q1 = applySearch(admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true));
      const r1 = await q1;
      if (!r1.error) return r1.count ?? 0;

      if (!isMissingColumnError(r1.error)) return 0;

      const q2 = applySearch(
        admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .or('is_adult_verified.eq.true,adult_verified.eq.true,verified.eq.true')
      );
      const r2 = await q2;
      if (!r2.error) return r2.count ?? 0;
      return 0;
    };

    const countBanned = async () => {
      const q1 = applySearch(
        admin
          .from('profiles')
          .select('id, user_sanctions!inner(banned_until)', { count: 'exact', head: true })
          .gt('user_sanctions.banned_until', nowIso)
      );
      const r1 = await q1;
      if (!r1.error) return r1.count ?? 0;

      const q2 = admin.from('user_sanctions').select('target_profile_id', { count: 'exact', head: true }).gt('banned_until', nowIso);
      const r2 = await q2;
      if (!r2.error) return r2.count ?? 0;
      return 0;
    };

    const buildCounts = async (total: number) => {
      const [banned, verified] = await Promise.all([countBanned(), countVerified()]);
      const active = Math.max(0, total - banned);
      return { total, active, banned, verified };
    };

    if (!err1) {
      const total = total1 ?? 0;
      const counts = await buildCounts(total);
      return NextResponse.json({ users: data1 ?? [], total, counts, limit, offset });
    }

    const msg = String(err1.message || '').toLowerCase();
    const canFallback =
      msg.includes('live_access_grants') ||
      msg.includes('user_sanctions') ||
      msg.includes('relationship') ||
      msg.includes('schema cache');
    if (!canFallback) {
      return NextResponse.json({ error: err1.message }, { status: 500 });
    }

    const queryFallback = applySearch(
      admin
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    const { data: data2, count: total2, error: err2 } = await queryFallback;
    if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });

    const users = (data2 ?? []) as any[];
    const ids = users.map((u) => u?.id).filter((id) => typeof id === 'string');

    if (ids.length > 0) {
      const { data: grants, error: grantsError } = await admin
        .from('live_access_grants')
        .select('profile_id')
        .in('profile_id', ids);

      if (!grantsError) {
        const enabled = new Set((grants ?? []).map((g: any) => g?.profile_id).filter((x) => typeof x === 'string'));
        for (const u of users) {
          const id = u?.id;
          if (typeof id !== 'string') continue;
          u.live_access_grants = enabled.has(id) ? [{ profile_id: id }] : [];
        }
      }

      const { data: sanctions, error: sanctionsError } = await admin
        .from('user_sanctions')
        .select('target_profile_id, banned_until')
        .in('target_profile_id', ids);

      if (!sanctionsError) {
        const bannedById = new Map<string, string | null>();
        for (const row of Array.isArray(sanctions) ? (sanctions as any[]) : []) {
          const key = String((row as any)?.target_profile_id ?? '');
          if (!key) continue;
          bannedById.set(key, (row as any)?.banned_until ?? null);
        }
        for (const u of users) {
          const id = u?.id;
          if (typeof id !== 'string') continue;
          u.user_sanctions = bannedById.has(id) ? [{ banned_until: bannedById.get(id) }] : [];
        }
      }
    }

    const total = total2 ?? 0;
    const counts = await buildCounts(total);
    return NextResponse.json({ users, total, counts, limit, offset });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
