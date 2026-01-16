import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/video/view
 * Increment view count for a video
 * Body: { videoId: string, type?: 'music_video' | 'playlist_item' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, type } = body;
    
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Missing videoId' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    let newViewCount = 0;
    
    // Try replay_playlist_items first (for playlist videos)
    if (type === 'playlist_item') {
      const { data: playlistItems } = await supabase
        .from('replay_playlist_items')
        .select('id, view_count')
        .eq('youtube_video_id', videoId);
      
      if (playlistItems && playlistItems.length > 0) {
        // Update all matching playlist items
        for (const item of playlistItems) {
          newViewCount = (item.view_count || 0) + 1;
          await supabase
            .from('replay_playlist_items')
            .update({ view_count: newViewCount })
            .eq('id', item.id);
        }
        return NextResponse.json({ success: true, viewCount: newViewCount });
      }
    }
    
    // Fallback to profile_music_videos
    const { data: video } = await supabase
      .from('profile_music_videos')
      .select('id, view_count')
      .eq('youtube_id', videoId)
      .maybeSingle();
    
    if (video) {
      newViewCount = (video.view_count || 0) + 1;
      await supabase
        .from('profile_music_videos')
        .update({ view_count: newViewCount })
        .eq('id', video.id);
    }
    
    return NextResponse.json({ success: true, viewCount: newViewCount });
  } catch (error: any) {
    console.error('[VIDEO-VIEW] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
