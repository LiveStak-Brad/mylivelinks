import { createRouteHandlerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/profile/[username]
 * Fetch complete public profile data (single query)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const supabase = createRouteHandlerClient(request);
  
  try {
    const { username } = params;
    
    // Get current user (optional - for relationship status)
    const { data: { user } } = await supabase.auth.getUser();
    const viewerId = user?.id || null;
    
    // Detect platform from user agent (mobile vs web)
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const platform = isMobile ? 'mobile' : 'web';
    
    // Call RPC function to get complete profile with adult filtering
    const { data, error } = await supabase.rpc('get_public_profile_with_adult_filtering', {
      p_username: username,
      p_viewer_id: viewerId,
      p_platform: platform
    });
    
    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }
    
    if (!data || data.error) {
      return NextResponse.json(
        { error: data?.error || 'Profile not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
