import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

async function fetchFromFirstExistingTable<T>(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  candidates: Array<{
    table: string;
    select: string;
    orderCol: string;
    statusCol: string;
  }>,
  status: string | null,
  limit: number,
  offset: number
): Promise<{ table: string; rows: T[] } | null> {
  for (const c of candidates) {
    let q = supabase.from(c.table).select(c.select).order(c.orderCol, { ascending: false }).range(offset, offset + limit - 1);
    if (status) q = q.eq(c.statusCol, status);
    const { data, error } = await q;
    if (!error) {
      return { table: c.table, rows: (data as any[]) as T[] };
    }
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

    const result = await fetchFromFirstExistingTable<any>(
      supabase,
      [
        {
          table: 'content_reports',
          select:
            'id, report_type, report_reason, report_details, status, created_at, reviewed_at, reviewed_by, admin_notes, reporter:profiles!content_reports_reporter_id_fkey(username, display_name), reported_user:profiles!content_reports_reported_user_id_fkey(id, username, display_name)',
          orderCol: 'created_at',
          statusCol: 'status',
        },
        {
          table: 'reports',
          select: '*',
          orderCol: 'created_at',
          statusCol: 'status',
        },
      ],
      status,
      limit,
      offset
    );

    if (!result) {
      return NextResponse.json({ error: 'No reports table found' }, { status: 500 });
    }

    return NextResponse.json({ reports: result.rows, source: result.table, limit, offset });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
