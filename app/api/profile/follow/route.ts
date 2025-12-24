import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/profile/follow
 * Toggle follow/unfollow
 * Body: { targetProfileId: string }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { targetProfileId } = body;
    
    if (!targetProfileId) {
      return NextResponse.json(
        { error: 'Missing targetProfileId' },
        { status: 400 }
      );
    }
    
    // Call RPC function to toggle follow
    const { data, error } = await supabase.rpc('toggle_follow', {
      p_follower_id: user.id,
      p_followee_id: targetProfileId
    });
    
    if (error) {
      console.error('Follow toggle error:', error);
      return NextResponse.json(
        { error: 'Failed to toggle follow' },
        { status: 500 }
      );
    }
    
    if (data?.error) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Follow API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

