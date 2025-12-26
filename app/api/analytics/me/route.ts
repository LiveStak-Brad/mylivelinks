import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

function parseRange(range: string | null): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const r = (range ?? '30d').toLowerCase();
  if (r === '7d') return { start: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000), end };
  if (r === '30d') return { start: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000), end };
  if (r === '90d') return { start: new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000), end };
  if (r === 'lifetime') return { start: new Date('2020-01-01T00:00:00.000Z'), end };

  throw new Error('INVALID_RANGE');
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const range = url.searchParams.get('range');

    let start: Date;
    let end: Date;
    try {
      ({ start, end } = parseRange(range));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'INVALID_RANGE') {
        return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
      }
      throw e;
    }

    const { data, error } = await supabase.rpc('get_user_analytics', {
      p_profile_id: user.id,
      p_start: start.toISOString(),
      p_end: end.toISOString(),
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('unauthorized')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (msg.includes('forbidden')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? {});
  } catch (err) {
    console.error('GET /api/analytics/me error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
