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
 * POST /api/admin/live/:id/end
 * End a live stream
 * Body: { reason?: string }
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
    const reason = body.reason || null;

    const supabase = createRouteHandlerClient(request);

    // Call the admin RPC function with audit logging
    const { error } = await supabase.rpc('admin_end_live_stream', {
      p_stream_id: streamId,
      p_reason: reason,
    });

    if (error) {
      console.error('Error ending stream:', error);
      if (error.message.includes('stream_not_found')) {
        return NextResponse.json({ error: 'Stream not found or already ended' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Stream ended successfully',
    });
  } catch (err) {
    console.error('Admin end stream error:', err);
    return authErrorToResponse(err);
  }
}


