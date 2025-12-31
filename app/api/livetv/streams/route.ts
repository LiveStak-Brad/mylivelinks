import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function streamTypeToLabel(streamType: string | null | undefined): string | null {
  switch ((streamType || '').toLowerCase()) {
    case 'irl':
      return 'IRL';
    case 'music':
      return 'Music';
    case 'gaming':
      return 'Gaming';
    case 'comedy':
      return 'Comedy';
    case 'justchatting':
      return 'Just Chatting';
    default:
      return null;
  }
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();

    // Fetch from trending RPC for live streams
    const { data: trendingStreams, error: trendingError } = await admin
      .rpc('rpc_get_trending_live_streams', {
        p_limit: 100,
        p_offset: 0
      });

    if (trendingError) {
      console.error('[LiveTV API] Trending RPC error:', trendingError);
      return NextResponse.json({ error: trendingError.message }, { status: 500 });
    }

    // Transform trending data to LiveTV format
    const normalized = (trendingStreams || []).map((stream: any, index: number) => ({
      id: String(stream.stream_id),
      slug: stream.username,
      streamer_display_name: stream.display_name || stream.username || 'Unknown',
      thumbnail_url: stream.avatar_url || null, // Use avatar as thumbnail
      viewer_count: stream.views_count || 0,
      category: null, // Add stream_type to trending RPC if needed
      stream_type: null,
      badges: stream.trending_score > 100 ? ['Trending'] : [],
      trendingRank: index + 1 // Add rank (1-indexed)
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
