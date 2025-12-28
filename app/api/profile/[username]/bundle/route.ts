import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/profile/[username]/bundle
 * Fetch profile bundle data (profile header + profile_type + blocks) via single RPC.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const supabase = createAuthedRouteHandlerClient(request);

  try {
    const { username } = params;

    const { data: { user } } = await supabase.auth.getUser();
    const viewerId = user?.id || null;

    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const platform = isMobile ? 'mobile' : 'web';

    const { data, error } = await supabase.rpc('get_profile_bundle', {
      p_username: username,
      p_viewer_id: viewerId,
      p_platform: platform,
    });

    if (error) {
      console.error('Profile bundle fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch profile bundle' }, { status: 500 });
    }

    if (!data || (data as any).error) {
      return NextResponse.json(
        { error: (data as any)?.error || 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Profile bundle API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
