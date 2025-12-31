import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Service-role list of active viewers for a live stream (bypasses RLS).
 * Query param: live_stream_id (required)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const liveStreamIdParam = searchParams.get('live_stream_id');

  if (!liveStreamIdParam) {
    return NextResponse.json({ error: 'live_stream_id is required' }, { status: 400 });
  }

  const live_stream_id = Number(liveStreamIdParam);
  if (!Number.isFinite(live_stream_id)) {
    return NextResponse.json({ error: 'live_stream_id must be a number' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const cutoffIso = new Date(Date.now() - 60_000).toISOString();

  try {
    const { data: rows, error } = await supabase
      .from('active_viewers')
      .select('viewer_id, is_active, last_active_at')
      .eq('live_stream_id', live_stream_id)
      .order('last_active_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[active-viewers/list] select error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const viewerIds = Array.from(
      new Set((rows || []).map((r) => r.viewer_id).filter((id): id is string => !!id))
    );

    if (viewerIds.length === 0) {
      return NextResponse.json({ viewers: [] });
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', viewerIds);

    if (profileError) {
      console.error('[active-viewers/list] profiles error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const profileMap = new Map(
      (profiles || []).map((p: any) => [String(p.id), { username: p.username, avatar_url: p.avatar_url }])
    );

    const viewers = (rows || []).map((row) => {
      const profile = profileMap.get(row.viewer_id);
      const is_active = Boolean(row.is_active) && row.last_active_at > cutoffIso;
      return {
        profile_id: row.viewer_id,
        username: profile?.username || 'Unknown viewer',
        avatar_url: profile?.avatar_url || null,
        is_active,
        last_seen: row.last_active_at,
      };
    });

    // Sort: active first (by last_seen desc), then inactive by last_seen desc
    viewers.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
    });

    return NextResponse.json({ viewers });
  } catch (err: any) {
    console.error('[active-viewers/list] exception:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
