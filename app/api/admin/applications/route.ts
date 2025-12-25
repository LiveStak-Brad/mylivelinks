import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

async function fetchFirstExisting(supabase: ReturnType<typeof createRouteHandlerClient>, opts: { status: string | null; limit: number; offset: number }) {
  const candidates = [
    {
      table: 'room_applications',
      select: '*, profile:profiles(username, display_name, avatar_url)',
      statusCol: 'status',
    },
    {
      table: 'applications',
      select: '*, profile:profiles(username, display_name, avatar_url)',
      statusCol: 'status',
    },
  ];

  for (const c of candidates) {
    let q = supabase.from(c.table).select(c.select).order('created_at', { ascending: false }).range(opts.offset, opts.offset + opts.limit - 1);
    if (opts.status) q = q.eq(c.statusCol, opts.status);
    const { data, error } = await q;
    if (!error) return { source: c.table, applications: data ?? [] };
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const statusParam = (url.searchParams.get('status') || '').trim().toLowerCase();
    const status = statusParam && statusParam !== 'all' ? statusParam : null;
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    const supabase = createRouteHandlerClient(request);
    const result = await fetchFirstExisting(supabase, { status, limit, offset });

    if (!result) {
      return NextResponse.json({ error: 'No applications table found' }, { status: 500 });
    }

    return NextResponse.json({ ...result, limit, offset });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
