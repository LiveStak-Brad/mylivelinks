import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getGifterStatus } from '@/lib/gifter-status';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient(request);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id });
    const viewerIsAdmin = isAdmin === true;

    const adminSupabase = getSupabaseAdmin();
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('lifetime_coins_gifted')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const lifetimeCoins = Number((profile as any).lifetime_coins_gifted ?? 0);
    const status = getGifterStatus(lifetimeCoins, { is_admin: viewerIsAdmin });

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('[API] gifter-status/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
