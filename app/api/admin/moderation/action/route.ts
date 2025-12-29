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

export async function POST(request: NextRequest) {
  const reqId = genReqId();

  try {
    const { user } = await requireAdmin(request);

    const body = await request.json().catch(() => null);
    const targetProfileId = body?.target_profile_id;
    const actionType = body?.action_type;
    const durationMinutes = body?.duration_minutes || null;
    const reason = body?.reason || null;
    const reportId = body?.report_id || null;
    const metadata = body?.metadata || null;

    // Validate required fields
    if (!targetProfileId || !actionType) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: target_profile_id, action_type', reqId },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions = ['warn', 'mute', 'timeout', 'ban', 'unban', 'remove_monetization', 'restore_monetization'];
    if (!validActions.includes(actionType)) {
      return NextResponse.json(
        { ok: false, error: `Invalid action_type. Must be one of: ${validActions.join(', ')}`, reqId },
        { status: 400 }
      );
    }

    // Validate duration for timeout/mute actions
    if (['mute', 'timeout', 'ban'].includes(actionType)) {
      if (!durationMinutes || durationMinutes <= 0) {
        return NextResponse.json(
          { ok: false, error: `action_type '${actionType}' requires duration_minutes > 0`, reqId },
          { status: 400 }
        );
      }
    }

    const supabase = createRouteHandlerClient(request);

    // Use RPC function to apply moderation action
    const { data, error } = await supabase.rpc('apply_moderation_action', {
      p_report_id: reportId,
      p_actor_profile_id: user.id,
      p_target_profile_id: targetProfileId,
      p_action_type: actionType,
      p_duration_minutes: durationMinutes,
      p_reason: reason,
      p_metadata: metadata,
    });

    if (error) {
      console.error('[moderation/action/POST] Error applying action:', error);
      return NextResponse.json(
        { ok: false, error: error.message || 'Failed to apply moderation action', reqId },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reqId,
      data: {
        action_id: data,
        success: true,
      },
    });
  } catch (err) {
    console.error('[moderation/action/POST] Unexpected error:', err);
    return authErrorToResponse(err);
  }
}


