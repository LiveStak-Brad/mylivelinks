import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/profile/follow
 * Toggle follow/unfollow
 * Body: { targetProfileId: string }
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in follow API:', authError);
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { targetProfileId } = body;
    
    if (!targetProfileId) {
      console.error('Missing targetProfileId in follow request');
      return NextResponse.json(
        { success: false, error: 'Missing targetProfileId' },
        { status: 400 }
      );
    }
    
    console.log('Follow request:', {
      userId: user.id,
      targetProfileId,
    });
    
    // Call RPC function to toggle follow
    const { data, error } = await supabase.rpc('toggle_follow', {
      p_follower_id: user.id,
      p_followee_id: targetProfileId
    });
    
    console.log('RPC toggle_follow result:', { data, error });
    
    if (error) {
      console.error('Follow toggle RPC error:', error);
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data) {
      console.error('No data returned from toggle_follow');
      return NextResponse.json(
        { success: false, error: 'No response from database' },
        { status: 500 }
      );
    }
    
    if (data?.error) {
      console.error('Follow toggle returned error:', data.error);
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 400 }
      );
    }
    
    console.log('Follow successful:', data);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Follow API exception:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

