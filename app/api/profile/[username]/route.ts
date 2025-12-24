import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/profile/[username]
 * Fetch complete public profile data (single query)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const supabase = createClient();
  
  try {
    const { username } = params;
    
    // Get current user (optional - for relationship status)
    const { data: { user } } = await supabase.auth.getUser();
    const viewerId = user?.id || null;
    
    // Call RPC function to get complete profile
    const { data, error } = await supabase.rpc('get_public_profile', {
      p_username: username,
      p_viewer_id: viewerId
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

