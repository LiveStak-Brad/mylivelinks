import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { randomBytes } from 'crypto';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED')
    return NextResponse.json({ ok: false, error: 'Unauthorized', reqId: genReqId() }, { status: 401 });
  if (msg === 'FORBIDDEN')
    return NextResponse.json({ ok: false, error: 'Forbidden', reqId: genReqId() }, { status: 403 });
  return NextResponse.json({ ok: false, error: 'Internal error', reqId: genReqId() }, { status: 500 });
}

function genReqId() {
  return randomBytes(8).toString('hex');
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const reqId = genReqId();

  try {
    const { user } = await requireAdmin(request);

    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ ok: false, error: 'Missing report ID', reqId }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const status = body?.status;
    const adminNote = body?.admin_note || null;

    if (!status) {
      return NextResponse.json({ ok: false, error: 'Missing status', reqId }, { status: 400 });
    }

    const validStatuses = ['open', 'under_review', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`, reqId },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient(request);

    // Use RPC function to update status with audit logging
    const { data, error } = await supabase.rpc('update_report_status', {
      p_report_id: reportId,
      p_actor_profile_id: user.id,
      p_status: status,
      p_admin_note: adminNote,
    });

    if (error) {
      console.error('[reports/[id]/status/POST] Error updating status:', error);
      return NextResponse.json(
        { ok: false, error: error.message || 'Failed to update report status', reqId },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reqId,
      data: { success: true },
    });
  } catch (err) {
    console.error('[reports/[id]/status/POST] Unexpected error:', err);
    return authErrorToResponse(err);
  }
}


