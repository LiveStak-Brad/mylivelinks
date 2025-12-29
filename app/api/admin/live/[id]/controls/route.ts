import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createRouteHandlerClient } from '@/lib/supabase-server';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST /api/admin/live/:id/controls
 * Update live stream controls (mute chat, throttle gifts)
 * Body: {
 *   chat_muted?: boolean,
 *   gifts_throttled?: boolean,
 *   throttle_level?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);

    const streamId = parseInt(params.id, 10);
    if (isNaN(streamId)) {
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { chat_muted, gifts_throttled, throttle_level } = body;

    // Validate at least one control is being set
    if (chat_muted === undefined && gifts_throttled === undefined && throttle_level === undefined) {
      return NextResponse.json(
        { error: 'At least one control parameter must be provided' },
        { status: 400 }
      );
    }

    // Validate types
    if (chat_muted !== undefined && typeof chat_muted !== 'boolean') {
      return NextResponse.json({ error: 'chat_muted must be a boolean' }, { status: 400 });
    }

    if (gifts_throttled !== undefined && typeof gifts_throttled !== 'boolean') {
      return NextResponse.json({ error: 'gifts_throttled must be a boolean' }, { status: 400 });
    }

    if (throttle_level !== undefined && typeof throttle_level !== 'string' && throttle_level !== null) {
      return NextResponse.json({ error: 'throttle_level must be a string or null' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);

    // Call the admin RPC function with audit logging
    const { error } = await supabase.rpc('admin_update_live_controls', {
      p_stream_id: streamId,
      p_chat_muted: chat_muted !== undefined ? chat_muted : null,
      p_gifts_throttled: gifts_throttled !== undefined ? gifts_throttled : null,
      p_throttle_level: throttle_level !== undefined ? throttle_level : null,
    });

    if (error) {
      console.error('Error updating stream controls:', error);
      if (error.message.includes('stream_not_found')) {
        return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Stream controls updated successfully',
      controls: {
        chat_muted,
        gifts_throttled,
        throttle_level,
      },
    });
  } catch (err) {
    console.error('Admin update controls error:', err);
    return authErrorToResponse(err);
  }
}


