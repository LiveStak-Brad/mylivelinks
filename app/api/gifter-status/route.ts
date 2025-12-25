import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getGifterStatus } from '@/lib/gifter-status';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });
    }

    let viewerIsAdmin = false;
    try {
      const supabase = createRouteHandlerClient(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id });
        viewerIsAdmin = isAdmin === true;
      }
    } catch {
      viewerIsAdmin = false;
    }

    const adminSupabase = getSupabaseAdmin();
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('lifetime_coins_gifted')
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const lifetimeCoins = Number((profile as any).lifetime_coins_gifted ?? 0);
    const status = getGifterStatus(lifetimeCoins, { is_admin: viewerIsAdmin });

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('[API] gifter-status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
