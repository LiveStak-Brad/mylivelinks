import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => null);
    const reportId = typeof body?.report_id === 'string' ? body.report_id : null;
    const resolution = body?.resolution;
    const note = body?.note ?? null;

    if (!reportId || !resolution) {
      return NextResponse.json({ error: 'Missing report_id or resolution' }, { status: 400 });
    }

    if (resolution !== 'dismissed' && resolution !== 'actioned') {
      return NextResponse.json({ error: 'Invalid resolution' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);
    const { error } = await supabase.rpc('admin_resolve_report', {
      p_report_id: reportId,
      p_resolution: resolution,
      p_note: note,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
