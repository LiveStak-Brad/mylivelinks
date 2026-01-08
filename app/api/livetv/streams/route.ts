import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Default avatar fallback for streams without profile pictures
const DEFAULT_AVATAR = '/no-profile-pic.png';

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
      const normalized = trendingStreams.map((stream: any, index: number) => ({
        id: String(stream.stream_id),
        slug: stream.username,
        streamer_display_name: stream.display_name || stream.username || 'Unknown',
        thumbnail_url: stream.avatar_url || DEFAULT_AVATAR,
        viewer_count: stream.views_count || 0,
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
    
    const { data: liveStreams, error: queryError } = await admin
      .from('live_streams')
      .select('id, profile_id, trending_score, views_count, started_at')
      .eq('live_available', true)
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

    const normalized = (liveStreams || []).map((stream: any, index: number) => {
      const profile = profileMap.get(stream.profile_id);
      return {
        id: String(stream.id),
        slug: profile?.username || 'unknown',
        streamer_display_name: profile?.display_name || profile?.username || 'Unknown',
        thumbnail_url: profile?.avatar_url || DEFAULT_AVATAR,
        viewer_count: stream.views_count || 0,
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
