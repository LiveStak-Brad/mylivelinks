import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/profile/follow
 * Toggle follow/unfollow
 * Body: { targetProfileId: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== FOLLOW API DEBUG ===');
    
    // Try to get auth token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let user = null;
    let supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use token from header
      const token = authHeader.replace('Bearer ', '');
      console.log('Using Authorization header token');
      
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      );
      
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
      
      if (tokenUser && !tokenError) {
        user = tokenUser;
        console.log('Auth via token successful:', user.id);
      } else {
        console.error('Token auth failed:', tokenError);
      }
    }
    
    // Fallback to cookie-based auth
    if (!user) {
      console.log('Trying cookie-based auth');
      supabase = createServerSupabaseClient();
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();
      
      if (cookieUser && !cookieError) {
        user = cookieUser;
        console.log('Auth via cookies successful:', user.id);
      } else {
        console.error('Cookie auth failed:', cookieError);
      }
    }
    
    if (!user) {
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

