import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prefer RPC (stable return shape) if present; fall back to direct table query.
    try {
      const { data, error } = await supabase.rpc('get_blocked_users', { p_user_id: user.id });
      if (!error) {
        return NextResponse.json({ blocked_users: data ?? [] });
      }
    } catch {
      // ignore
    }

    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id, blocked_at, blocked_profile:profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_url)')
      .eq('blocker_id', user.id)
      .order('blocked_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized = (data ?? []).map((row: any) => ({
      blocked_id: row.blocked_id,
      blocked_at: row.blocked_at,
      blocked_username: row.blocked_profile?.username ?? null,
      blocked_display_name: row.blocked_profile?.display_name ?? null,
      blocked_avatar_url: row.blocked_profile?.avatar_url ?? null,
    }));

    return NextResponse.json({ blocked_users: normalized });
  } catch (err) {
    console.error('GET /api/blocks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
