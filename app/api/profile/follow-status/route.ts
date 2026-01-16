import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/profile/follow-status?targetProfileId=xxx
 * Get follow status between current user and target profile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json(
        { is_following: false, is_followed_by: false, is_mutual: false },
        { status: 200 }
      );
    }
    
    const targetProfileId = request.nextUrl.searchParams.get('targetProfileId');
    
    if (!targetProfileId) {
      return NextResponse.json(
        { error: 'Missing targetProfileId' },
        { status: 400 }
      );
    }
    
    // Check if current user follows target
    const { data: followingData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('followee_id', targetProfileId)
      .maybeSingle();
    
    const is_following = !!followingData;
    
    // Check if target follows current user
    const { data: followedByData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', targetProfileId)
      .eq('followee_id', user.id)
      .maybeSingle();
    
    const is_followed_by = !!followedByData;
    
    // Mutual = both follow each other
    const is_mutual = is_following && is_followed_by;
    
    return NextResponse.json({
      is_following,
      is_followed_by,
      is_mutual,
      is_friends: is_mutual, // alias
    });
  } catch (error: any) {
    console.error('[FOLLOW-STATUS] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
