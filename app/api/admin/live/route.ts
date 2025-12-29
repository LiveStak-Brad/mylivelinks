import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * GET /api/admin/live
 * List live streams with filters
 * Query params:
 * - status: 'live' | 'ended' | 'all' (default: 'live')
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - q: search query (username or room_name)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const status = (url.searchParams.get('status') || 'live').toLowerCase();
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const searchQuery = url.searchParams.get('q')?.trim() || '';

    const admin = getSupabaseAdmin();

    // Build base query
    let query = admin
      .from('live_streams')
      .select(`
        id,
        profile_id,
        room_name,
        started_at,
        ended_at,
        status,
        region,
        live_available,
        is_published,
        profile:profiles!live_streams_profile_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('started_at', { ascending: false });

    // Apply status filter
    if (status === 'live') {
      query = query.eq('status', 'live').eq('live_available', true);
    } else if (status === 'ended') {
      query = query.eq('status', 'ended');
    }
    // 'all' = no filter

    // Apply search filter if provided
    if (searchQuery) {
      // We need to filter by profile username or room_name
      // Since we can't filter joined tables directly, we'll fetch and filter in memory
      // For production, consider a more efficient approach with views or full-text search
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: streams, error } = await query;
    if (error) {
      console.error('Error fetching live streams:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get viewer counts from active_viewers table
    const streamIds = (streams || []).map((s: any) => s.id).filter((id: any) => id != null);
    const viewerCounts = new Map<number, number>();

    if (streamIds.length > 0) {
      const { data: viewers, error: viewersError } = await admin
        .from('active_viewers')
        .select('live_stream_id')
        .in('live_stream_id', streamIds);

      if (!viewersError && viewers) {
        for (const row of viewers as any[]) {
          const key = Number(row.live_stream_id);
          viewerCounts.set(key, (viewerCounts.get(key) || 0) + 1);
        }
      }
    }

    // Get live controls for each stream
    const controlsMap = new Map<number, any>();
    if (streamIds.length > 0) {
      const { data: controls, error: controlsError } = await admin
        .from('live_controls')
        .select('stream_id, chat_muted, gifts_throttled, throttle_level')
        .in('stream_id', streamIds);

      if (!controlsError && controls) {
        for (const ctrl of controls as any[]) {
          controlsMap.set(Number(ctrl.stream_id), {
            chat_muted: ctrl.chat_muted,
            gifts_throttled: ctrl.gifts_throttled,
            throttle_level: ctrl.throttle_level,
          });
        }
      }
    }

    // Normalize response with viewer counts and controls
    let normalized = (streams || []).map((s: any) => ({
      id: s.id,
      profile_id: s.profile_id,
      room_name: s.room_name,
      started_at: s.started_at,
      ended_at: s.ended_at,
      status: s.status,
      region: s.region,
      live_available: s.live_available,
      is_published: s.is_published,
      viewer_count: viewerCounts.get(Number(s.id)) || 0,
      host: s.profile ? {
        id: s.profile.id,
        username: s.profile.username,
        display_name: s.profile.display_name,
        avatar_url: s.profile.avatar_url,
      } : null,
      controls: controlsMap.get(Number(s.id)) || {
        chat_muted: false,
        gifts_throttled: false,
        throttle_level: null,
      },
    }));

    // Apply search filter in memory if needed
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      normalized = normalized.filter((s: any) => {
        const username = s.host?.username?.toLowerCase() || '';
        const displayName = s.host?.display_name?.toLowerCase() || '';
        const roomName = s.room_name?.toLowerCase() || '';
        return username.includes(lowerQuery) || displayName.includes(lowerQuery) || roomName.includes(lowerQuery);
      });
    }

    return NextResponse.json({
      streams: normalized,
      limit,
      offset,
      count: normalized.length,
    });
  } catch (err) {
    console.error('Admin live streams error:', err);
    return authErrorToResponse(err);
  }
}


