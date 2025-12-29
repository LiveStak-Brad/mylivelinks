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
 * GET /api/admin/live/health
 * Get live stream health metrics
 * Returns:
 * - live_count: Number of currently active streams
 * - token_success_rate: Percentage of successful token requests (last 1h)
 * - connection_success_rate: Percentage of successful room connections (last 1h)
 * - avg_join_time_ms: Average time to connect to room in ms (last 1h)
 * - error_rate: Percentage of failed connections (last 1h)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const supabase = createRouteHandlerClient(request);

    // Call the health metrics RPC function
    const { data, error } = await supabase.rpc('admin_live_health');

    if (error) {
      console.error('Error fetching live health metrics:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      metrics: data || {
        live_count: 0,
        token_success_rate: 0,
        connection_success_rate: 0,
        avg_join_time_ms: 0,
        error_rate: 0,
        total_requests_1h: 0,
        successful_connections_1h: 0,
        failed_connections_1h: 0,
      },
    });
  } catch (err) {
    console.error('Admin live health error:', err);
    return authErrorToResponse(err);
  }
}


