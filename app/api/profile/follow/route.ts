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
    // Debug: Log ALL cookies received
    const allCookies = request.cookies.getAll();
    console.log('[AUTH] Cookies received:', {
      count: allCookies.length,
      names: allCookies.map(c => c.name),
      hasAuthCookie: allCookies.some(c => c.name.includes('auth'))
    });
    
    // Create Supabase client with proper request cookie handling
    const supabase = createRouteHandlerClient(request);
    
    // Get authenticated user from cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('[AUTH] User check result:', { 
      userId: user?.id || 'NULL', 
      error: authError?.message || 'none',
      errorStatus: authError?.status || 'none'
    });
    
    if (!user || authError) {
      console.error('[AUTH] AUTHENTICATION FAILED - Returning 401');
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
    
    console.log('[FOLLOW] Proceeding with user:', user.id);
    
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
    
    console.log('[FOLLOW] Success');
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[FOLLOW] Exception:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
