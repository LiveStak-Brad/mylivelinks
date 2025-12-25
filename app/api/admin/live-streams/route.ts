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
    const status = (url.searchParams.get('status') || 'active').toLowerCase();
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    const admin = getSupabaseAdmin();
    let query = admin
      .from('live_streams')
      .select('id, profile_id, live_available, started_at, ended_at, published_at, unpublished_at, profile:profiles(username, display_name, avatar_url)')
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === 'active') {
      query = query.eq('live_available', true);
    } else if (status === 'ended') {
      query = query.eq('live_available', false);
    }

    const { data: streams, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (streams || []).map((s: any) => s.id).filter((v: any) => v !== null && v !== undefined);
    const viewerCounts = new Map<number, number>();

    if (ids.length > 0) {
      const { data: viewers, error: viewersError } = await admin
        .from('active_viewers')
        .select('live_stream_id')
        .in('live_stream_id', ids);

      if (!viewersError && viewers) {
        for (const row of viewers as any[]) {
          const key = Number(row.live_stream_id);
          viewerCounts.set(key, (viewerCounts.get(key) || 0) + 1);
        }
      }
    }

    const normalized = (streams || []).map((s: any) => ({
      ...s,
      viewer_count: viewerCounts.get(Number(s.id)) || 0,
    }));

    return NextResponse.json({ live_streams: normalized, limit, offset });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
