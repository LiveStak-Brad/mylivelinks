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
    const applicationId = typeof body?.application_id === 'string' ? body.application_id : null;
    const decision = body?.decision;
    const note = body?.note ?? null;

    if (!applicationId || !decision) {
      return NextResponse.json({ error: 'Missing application_id or decision' }, { status: 400 });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);
    const { error } = await supabase.rpc('admin_decide_application', {
      p_application_id: applicationId,
      p_decision: decision,
      p_note: note,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
