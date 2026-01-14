import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchSearchResults, type SearchResultsLimits } from '@/lib/search';

/**
 * GET /api/search?q=query&people=5&posts=5&teams=5&live=5&music=5&videos=5
 * Unified search endpoint for profiles, posts, teams, live streams, music, and videos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json({
        people: [],
        posts: [],
        teams: [],
        live: [],
        music: [],
        videos: [],
        comments: [],
      });
    }

    // Parse optional limits from query params
    const limits: SearchResultsLimits = {};
    const limitKeys = ['people', 'posts', 'teams', 'live', 'music', 'videos', 'comments'] as const;
    for (const key of limitKeys) {
      const val = searchParams.get(key);
      if (val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
          limits[key] = Math.min(parsed, 50); // Cap at 50
        }
      }
    }

    // Create authenticated Supabase client for the request
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore - called from Server Component
            }
          },
        },
      }
    );

    const results = await fetchSearchResults({
      term: query,
      client: supabase,
      limits,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
