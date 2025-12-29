import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/search/users?q=query&limit=10
 * Search for users by username or display name
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    const admin = getSupabaseAdmin();

    // Search for users by username or display_name
    const { data: users, error } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_live, follower_count')
      .or(
        `username.ilike.%${query}%,display_name.ilike.%${query}%`
      )
      .order('follower_count', { ascending: false })
      .limit(Math.min(limit, 50)); // Cap at 50

    if (error) {
      console.error('[SEARCH_USERS] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('[SEARCH_USERS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

