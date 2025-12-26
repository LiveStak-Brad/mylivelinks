import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function parseLimit(value: string | null) {
  if (!value) return 50;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(n, 200));
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const start = parseDateParam(searchParams.get('start'));
    const end = parseDateParam(searchParams.get('end'));
    const limit = parseLimit(searchParams.get('limit'));

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end are required ISO timestamps' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);
    const { data, error } = await supabase.rpc('admin_get_top_buyers', {
      p_start: start.toISOString(),
      p_end: end.toISOString(),
      p_limit: limit,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (err) {
    return authErrorToResponse(err);
  }
}
