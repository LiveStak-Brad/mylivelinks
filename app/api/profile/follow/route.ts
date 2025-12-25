import { createRouteHandlerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === '1';

/**
 * POST /api/profile/follow
 * Toggle follow/unfollow
 * Body: { targetProfileId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with proper request cookie handling
    const supabase = createRouteHandlerClient(request);
    
    // Get authenticated user from cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (DEBUG_AUTH) {
      console.log('[AUTH] Follow API - User check:', { 
        userId: user?.id || 'null', 
        error: authError?.message || 'none',
        hasCookies: request.cookies.getAll().length > 0
      });
    }
    
    if (!user || authError) {
      if (DEBUG_AUTH) {
        console.log('[AUTH] Authentication failed - returning 401');
      }
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { targetProfileId } = body;
    
    if (!targetProfileId) {
      return NextResponse.json(
        { success: false, error: 'Missing targetProfileId' },
        { status: 400 }
      );
    }
    
    if (DEBUG_AUTH) {
      console.log('[FOLLOW] Request:', {
        userId: user.id,
        targetProfileId,
      });
    }
    
    // Call RPC function to toggle follow
    const { data, error } = await supabase.rpc('toggle_follow', {
      p_follower_id: user.id,
      p_followee_id: targetProfileId
    });
    
    if (error) {
      console.error('[FOLLOW] RPC error:', error);
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data) {
      console.error('[FOLLOW] No data returned from toggle_follow');
      return NextResponse.json(
        { success: false, error: 'No response from database' },
        { status: 500 }
      );
    }
    
    if (data?.error) {
      console.error('[FOLLOW] Toggle returned error:', data.error);
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 400 }
      );
    }
    
    if (DEBUG_AUTH) {
      console.log('[FOLLOW] Success:', data);
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[FOLLOW] Exception:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
