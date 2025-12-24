import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/profile/followers?profileId=xxx&limit=20&offset=0
 * Get paginated followers list
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Missing profileId' },
        { status: 400 }
      );
    }
    
    // Call RPC function to get followers
    const { data, error } = await supabase.rpc('get_followers_list', {
      p_profile_id: profileId,
      p_limit: limit,
      p_offset: offset
    });
    
    if (error) {
      console.error('Followers fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch followers' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Followers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

