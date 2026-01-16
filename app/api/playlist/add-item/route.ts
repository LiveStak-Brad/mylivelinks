import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

// Helper to extract YouTube video ID from URL
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/i);
  return match?.[1] || null;
}

/**
 * POST /api/playlist/add-item
 * Add a YouTube video to a playlist
 * Body: { playlistId: string, youtubeUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { playlistId, youtubeUrl } = body;
    
    if (!playlistId || !youtubeUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing playlistId or youtubeUrl' },
        { status: 400 }
      );
    }
    
    // Extract YouTube video ID
    const youtubeVideoId = extractYoutubeId(youtubeUrl);
    if (!youtubeVideoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }
    
    // Verify user owns the playlist
    const { data: playlist, error: playlistError } = await supabase
      .from('replay_playlists')
      .select('id, profile_id')
      .eq('id', playlistId)
      .single();
    
    if (playlistError || !playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }
    
    if (playlist.profile_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not own this playlist' },
        { status: 403 }
      );
    }
    
    // Check if video already exists in playlist
    const { data: existingItem } = await supabase
      .from('replay_playlist_items')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('youtube_video_id', youtubeVideoId)
      .maybeSingle();
    
    if (existingItem) {
      return NextResponse.json(
        { success: false, error: 'This video is already in the playlist' },
        { status: 400 }
      );
    }
    
    // Get the next position
    const { data: lastItem } = await supabase
      .from('replay_playlist_items')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const nextPosition = (lastItem?.position ?? -1) + 1;
    
    // Fetch video metadata from YouTube oEmbed API
    let title = 'Untitled';
    let thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
    
    try {
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeVideoId}&format=json`
      );
      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        title = oembedData.title || title;
        thumbnailUrl = oembedData.thumbnail_url || thumbnailUrl;
      }
    } catch (e) {
      // Use defaults if oEmbed fails
    }
    
    // Insert the new item
    const { data: newItem, error: insertError } = await supabase
      .from('replay_playlist_items')
      .insert({
        playlist_id: playlistId,
        youtube_video_id: youtubeVideoId,
        youtube_url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
        title,
        thumbnail_url: thumbnailUrl,
        position: nextPosition,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[PLAYLIST-ADD-ITEM] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      item: newItem,
    });
  } catch (error: any) {
    console.error('[PLAYLIST-ADD-ITEM] Exception:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
