import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/video/stats?videoId=xxx&creatorId=xxx
 * Get video stats (likes, comments) and creator follower count
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    
    const videoId = request.nextUrl.searchParams.get('videoId');
    const creatorId = request.nextUrl.searchParams.get('creatorId');
    
    if (!videoId || !creatorId) {
      return NextResponse.json(
        { error: 'Missing videoId or creatorId' },
        { status: 400 }
      );
    }
    
    // Get current user (optional - for is_liked_by_me)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get creator's follower count
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('follower_count')
      .eq('id', creatorId)
      .single();
    
    const follower_count = creatorProfile?.follower_count || 0;
    
    // Get video like count from video_likes table
    const { count: like_count } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);
    
    // Get comment count from video_comments table
    const { count: comment_count } = await supabase
      .from('video_comments')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);
    
    // Check if current user liked this video
    let is_liked_by_me = false;
    if (user) {
      const { data: userLike } = await supabase
        .from('video_likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      is_liked_by_me = !!userLike;
    }
    
    return NextResponse.json({
      like_count: like_count || 0,
      comment_count: comment_count || 0,
      follower_count,
      is_liked_by_me,
    });
  } catch (error: any) {
    console.error('[VIDEO-STATS] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
