import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

/**
 * GET /api/config/feature-flags
 * Returns all feature flags as a map
 * Auth optional - accessible to authenticated users and public (controlled by RLS)
 * 
 * Returns: { flags: { [key: string]: boolean } }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Try to get user (optional - endpoint works without auth too)
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all feature flags
    // Note: RLS allows authenticated users to read, but for public access
    // we use anon key which has limited access
    const { data: flags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('key, enabled')
      .order('key');

    if (flagsError) {
      console.error('Error fetching feature flags:', flagsError);
      return NextResponse.json(
        { error: 'Failed to fetch feature flags' },
        { status: 500 }
      );
    }

    // Transform to map format
    const flagsMap = (flags || []).reduce((acc, flag) => {
      acc[flag.key] = flag.enabled;
      return acc;
    }, {} as Record<string, boolean>);

    // Cache for 30 seconds to reduce load
    return NextResponse.json(
      { flags: flagsMap },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/config/feature-flags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


