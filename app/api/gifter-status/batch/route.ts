import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getGifterStatus } from '@/lib/gifter-status';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient(request);

  try {
    let viewerIsAdmin = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id });
        viewerIsAdmin = isAdmin === true;
      }
    } catch {
      viewerIsAdmin = false;
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const profileIds = Array.isArray(body?.profileIds)
      ? body.profileIds.filter((id: any) => typeof id === 'string' && id.length > 0)
      : [];

    if (profileIds.length === 0) {
      return NextResponse.json({ statuses: {} }, { status: 200 });
    }

    if (profileIds.length > 200) {
      return NextResponse.json({ error: 'Too many profileIds' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('id, lifetime_coins_gifted')
      .in('id', profileIds);

    if (error) {
      console.error('[API] gifter-status/batch error:', error);
      return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 });
    }

    const statuses: Record<string, any> = {};
    for (const row of data || []) {
      const lifetimeCoins = Number((row as any).lifetime_coins_gifted ?? 0);
      statuses[(row as any).id] = getGifterStatus(lifetimeCoins, { is_admin: viewerIsAdmin });
    }

    return NextResponse.json({ statuses }, { status: 200 });
  } catch (error) {
    console.error('[API] gifter-status/batch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
