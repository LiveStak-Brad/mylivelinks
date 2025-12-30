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

function isNotWiredError(err: any) {
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message : '';
  return (
    code === '42P01' ||
    code === '42883' ||
    code === '42703' ||
    /relation .* does not exist/i.test(message) ||
    /function .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message)
  );
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const reqId = genReqId();

  try {
    await requireAdmin(request);

    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ ok: false, error: 'Missing report ID', reqId }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);

    const { data: report, error: reportError } = await supabase
      .from('content_reports')
      .select(
        'id, reporter_id, reported_user_id, report_type, report_reason, report_details, context_details, status, created_at, reviewed_at, reviewed_by, admin_notes, reporter:profiles!content_reports_reporter_id_fkey(id, username, display_name, avatar_url), reported_user:profiles!content_reports_reported_user_id_fkey(id, username, display_name, avatar_url), reviewer:profiles!content_reports_reviewed_by_fkey(id, username, display_name)'
      )
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      console.error('[reports/[id]/GET] Error fetching report:', reportError);
      return NextResponse.json(
        { ok: false, error: reportError?.message || 'Report not found', reqId },
        { status: reportError?.code === 'PGRST116' ? 404 : 500 }
      );
    }

    const relatedMessages: any[] = [];

    // Fetch moderation actions for this report
    const { data: actions, error: actionsError } = await supabase
      .from('moderation_actions')
      .select(
        'id, action_type, duration_minutes, reason, created_at, actor:profiles!moderation_actions_actor_profile_id_fkey(username, display_name)'
      )
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    const moderationActions = actionsError && isNotWiredError(actionsError) ? [] : actions || [];

    return NextResponse.json({
      ok: true,
      reqId,
      data: {
        report,
        relatedMessages,
        moderationActions,
      },
    });
  } catch (err) {
    console.error('[reports/[id]/GET] Unexpected error:', err);
    return authErrorToResponse(err);
  }
}


