import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

/**
 * GET /api/profile/top-friends?profileId=xxx
 * Get top friends for a profile
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient(request, response);

    console.log('[TOP_FRIENDS] Fetching for profile:', profileId);

    // Call RPC function to get top friends with full profile data
    const { data, error } = await supabase.rpc('get_top_friends', {
      p_profile_id: profileId,
    });

    if (error) {
      console.error('[TOP_FRIENDS] RPC Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch top friends', details: error.message },
        { status: 500 }
      );
    }

    console.log('[TOP_FRIENDS] Success, found', data?.length || 0, 'friends');
    return NextResponse.json(
      { topFriends: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error: any) {
    console.error('[TOP_FRIENDS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/top-friends
 * Add or update a top friend
 * Body: { friendId: string, position: number }
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  try {
    const supabase = createRouteHandlerClient(request, response);

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[TOP_FRIENDS] Auth check:', { user: user?.id, authError });

    if (!user) {
      console.error('[TOP_FRIENDS] No authenticated user');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { friendId, position } = body;
    
    console.log('[TOP_FRIENDS] Adding friend:', { userId: user.id, friendId, position });

    if (!friendId || typeof position !== 'number') {
      return NextResponse.json(
        { error: 'Friend ID and position are required' },
        { status: 400 }
      );
    }

    if (position < 1 || position > 8) {
      return NextResponse.json(
        { error: 'Position must be between 1 and 8' },
        { status: 400 }
      );
    }

    // Call RPC function to upsert top friend
    const { data, error } = await supabase.rpc('upsert_top_friend', {
      p_profile_id: user.id,
      p_friend_id: friendId,
      p_position: position,
    });

    if (error) {
      console.error('[TOP_FRIENDS] Error upserting top friend:', error);
      return NextResponse.json(
        { error: 'Failed to add top friend' },
        { status: 500 }
      );
    }

    const result = data as { success: boolean; error?: string };

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add top friend' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TOP_FRIENDS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/top-friends?friendId=xxx
 * Remove a top friend
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.next();
  try {
    const supabase = createRouteHandlerClient(request, response);

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');

    if (!friendId) {
      return NextResponse.json(
        { error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    // Call RPC function to remove top friend
    const { data, error } = await supabase.rpc('remove_top_friend', {
      p_profile_id: user.id,
      p_friend_id: friendId,
    });

    if (error) {
      console.error('[TOP_FRIENDS] Error removing top friend:', error);
      return NextResponse.json(
        { error: 'Failed to remove top friend' },
        { status: 500 }
      );
    }

    const result = data as { success: boolean; error?: string };

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove top friend' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TOP_FRIENDS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile/top-friends/reorder
 * Reorder a top friend (swap positions)
 * Body: { friendId: string, newPosition: number }
 */
export async function PATCH(request: NextRequest) {
  const response = NextResponse.next();
  try {
    const supabase = createRouteHandlerClient(request, response);

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { friendId, newPosition } = body;

    console.log('[TOP_FRIENDS] Reorder request:', { userId: user.id, friendId, newPosition });

    if (!friendId || typeof newPosition !== 'number') {
      return NextResponse.json(
        { error: 'Friend ID and new position are required' },
        { status: 400 }
      );
    }

    if (newPosition < 1 || newPosition > 8) {
      return NextResponse.json(
        { error: 'Position must be between 1 and 8' },
        { status: 400 }
      );
    }

    // Call RPC function to reorder top friends
    const { data, error } = await supabase.rpc('reorder_top_friends', {
      p_profile_id: user.id,
      p_friend_id: friendId,
      p_new_position: newPosition,
    });

    console.log('[TOP_FRIENDS] Reorder RPC result:', { data, error });

    if (error) {
      console.error('[TOP_FRIENDS] Error reordering top friend:', error);
      return NextResponse.json(
        { error: 'Failed to reorder top friend', details: error.message },
        { status: 500 }
      );
    }

    const result = data as { success: boolean; error?: string };

    if (!result.success) {
      console.error('[TOP_FRIENDS] Reorder failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to reorder top friend' },
        { status: 400 }
      );
    }

    console.log('[TOP_FRIENDS] Reorder successful');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TOP_FRIENDS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

