import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/video/like
 * Toggle like on a video
 * Body: { videoId: string }
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
    const { videoId } = body;
    
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Missing videoId' },
        { status: 400 }
      );
    }
    
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('video_likes')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existingLike) {
      // Unlike - delete the like
      const { error: deleteError } = await supabase
        .from('video_likes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', user.id);
      
      if (deleteError) {
        console.error('[VIDEO-LIKE] Delete error:', deleteError);
        return NextResponse.json(
          { success: false, error: deleteError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        action: 'unliked',
        is_liked: false,
      });
    } else {
      // Like - insert
      const { error: insertError } = await supabase
        .from('video_likes')
        .insert({
          video_id: videoId,
          user_id: user.id,
        });
      
      if (insertError) {
        console.error('[VIDEO-LIKE] Insert error:', insertError);
        return NextResponse.json(
          { success: false, error: insertError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        action: 'liked',
        is_liked: true,
      });
    }
  } catch (error: any) {
    console.error('[VIDEO-LIKE] Exception:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
