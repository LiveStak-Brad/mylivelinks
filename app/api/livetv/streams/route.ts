import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Default avatar fallback for streams without profile pictures
const DEFAULT_AVATAR = '/no-profile-pic.png';

// Helper to fetch active viewer counts for multiple streams
async function getActiveViewerCounts(
  admin: ReturnType<typeof getSupabaseAdmin>,
  streamIds: number[]
): Promise<Map<number, number>> {
  if (streamIds.length === 0) return new Map();

  const cutoffIso = new Date(Date.now() - 60_000).toISOString();

  // Query active_viewers grouped by live_stream_id
  const { data: rows, error } = await admin
    .from('active_viewers')
    .select('live_stream_id')
    .in('live_stream_id', streamIds)
    .eq('is_active', true)
    .gt('last_active_at', cutoffIso);

  if (error) {
    console.error('[LiveTV API] Error fetching active viewers:', error);
    return new Map();
  }

  // Count occurrences per stream
  const countMap = new Map<number, number>();
  for (const row of rows || []) {
    const id = row.live_stream_id;
    countMap.set(id, (countMap.get(id) || 0) + 1);
  }

  return countMap;
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();

    // Try the RPC first (same as TrendingModal uses)
    const { data: trendingStreams, error: rpcError } = await admin
      .rpc('rpc_get_trending_live_streams', {
        p_limit: 100,
        p_offset: 0
      });

    if (rpcError) {
      console.error('[LiveTV API] RPC error:', rpcError);
    }

    // If RPC worked, use that data
    if (trendingStreams && trendingStreams.length > 0) {
      console.log('[LiveTV API] RPC returned streams:', trendingStreams.length);

      // Get active viewer counts for all streams
      const streamIds = trendingStreams.map((s: any) => Number(s.stream_id));
      const viewerCounts = await getActiveViewerCounts(admin, streamIds);

      const normalized = trendingStreams.map((stream: any, index: number) => ({
        id: String(stream.stream_id),
        slug: stream.username,
        streamer_display_name: stream.display_name || stream.username || 'Unknown',
        thumbnail_url: stream.avatar_url || DEFAULT_AVATAR,
        total_views: stream.views_count || 0,
        viewer_count: viewerCounts.get(Number(stream.stream_id)) || 0,
        category: null,
        stream_type: null,
        badges: (stream.trending_score || 0) > 100 ? ['Trending'] : [],
        trendingRank: index + 1
      }));
      
      return NextResponse.json(
        { streams: normalized },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Fallback: Direct query if RPC fails or returns empty
    console.log('[LiveTV API] RPC returned empty, trying direct query...');
    
    // Only show solo streams in LiveTV, not group/room streams
    const { data: liveStreams, error: queryError } = await admin
      .from('live_streams')
      .select('id, profile_id, trending_score, views_count, started_at, streaming_mode')
      .eq('live_available', true)
      .or('streaming_mode.is.null,streaming_mode.eq.solo') // Exclude group streams
      .order('trending_score', { ascending: false, nullsFirst: false })
      .limit(100);

    if (queryError) {
      console.error('[LiveTV API] Direct query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Get profile data for each stream
    const profileIds = (liveStreams || []).map((s: any) => s.profile_id);
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', profileIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Get active viewer counts for all streams
    const streamIds = (liveStreams || []).map((s: any) => Number(s.id));
    const viewerCounts = await getActiveViewerCounts(admin, streamIds);

    const normalized = (liveStreams || []).map((stream: any, index: number) => {
      const profile = profileMap.get(stream.profile_id);
      return {
        id: String(stream.id),
        slug: profile?.username || 'unknown',
        streamer_display_name: profile?.display_name || profile?.username || 'Unknown',
        thumbnail_url: profile?.avatar_url || DEFAULT_AVATAR,
        total_views: stream.views_count || 0,
        viewer_count: viewerCounts.get(Number(stream.id)) || 0,
        category: null,
        stream_type: null,
        badges: (stream.trending_score || 0) > 100 ? ['Trending'] : [],
        trendingRank: index + 1
      };
    });

    return NextResponse.json(
      { streams: normalized },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (err: any) {
    console.error('[LiveTV API] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
