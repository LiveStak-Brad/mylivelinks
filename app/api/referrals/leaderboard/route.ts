import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type RangeParam = '7d' | '30d' | 'all';

type CursorPayload = {
  last_rank: number;
  active: number;
  joined: number;
  last_activity_at: string | null;
  profile_id: string;
};

function parseRange(raw: string | null): RangeParam {
  const v = String(raw || '7d').trim().toLowerCase();
  if (v === '7d' || v === '30d' || v === 'all') return v;
  return '7d';
}

function parseLimit(raw: string | null): number {
  const n = Number.parseInt(String(raw || '25'), 10);
  if (!Number.isFinite(n)) return 25;
  return Math.min(Math.max(n, 1), 100);
}

function decodeCursor(raw: string | null): CursorPayload | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  try {
    const json = Buffer.from(v, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as Partial<CursorPayload>;
    const last_rank = Number(parsed.last_rank ?? NaN);
    const active = Number(parsed.active ?? NaN);
    const joined = Number(parsed.joined ?? NaN);
    const profile_id = typeof parsed.profile_id === 'string' ? parsed.profile_id : '';
    const last_activity_at =
      parsed.last_activity_at === null || typeof parsed.last_activity_at === 'string'
        ? (parsed.last_activity_at ?? null)
        : null;

    if (!Number.isFinite(last_rank) || last_rank < 0) return null;
    if (!Number.isFinite(active) || active < 0) return null;
    if (!Number.isFinite(joined) || joined < 0) return null;
    if (!profile_id) return null;

    return { last_rank, active, joined, last_activity_at, profile_id };
  } catch {
    return null;
  }
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const range = parseRange(url.searchParams.get('range'));
    const limit = parseLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));

    const admin = getSupabaseAdmin();

    const rpcArgs: any = {
      p_range: range,
      p_limit: limit,
      p_cursor: cursor
        ? {
            active: cursor.active,
            joined: cursor.joined,
            last_activity_at: cursor.last_activity_at,
            profile_id: cursor.profile_id,
          }
        : null,
    };

    const { data, error } = await admin.rpc('get_referrals_leaderboard', rpcArgs);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = Array.isArray(data) ? data : [];
    const baseRank = cursor?.last_rank ?? 0;

    const items = rows.map((r: any, idx: number) => ({
      profile_id: String(r?.profile_id ?? ''),
      username: String(r?.username ?? ''),
      avatar_url: r?.avatar_url ? String(r.avatar_url) : null,
      joined: Number(r?.joined ?? 0),
      active: Number(r?.active ?? 0),
      rank: baseRank + idx + 1,
    }));

    const last = items.length ? items[items.length - 1] : null;
    const next_cursor =
      items.length === limit && last
        ? encodeCursor({
            last_rank: Number(last.rank),
            active: Number(last.active),
            joined: Number(last.joined),
            last_activity_at: rows[rows.length - 1]?.last_activity_at ? String(rows[rows.length - 1].last_activity_at) : null,
            profile_id: String(last.profile_id),
          })
        : null;

    const res = NextResponse.json(
      {
        range,
        items,
        next_cursor,
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
