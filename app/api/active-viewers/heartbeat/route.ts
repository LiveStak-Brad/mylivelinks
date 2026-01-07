import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Service-role heartbeat for active viewers.
 * This bypasses RLS so authenticated web clients can ensure their view is counted.
 *
 * Body: { live_stream_id: number, viewer_id: string, is_active?: boolean, is_unmuted?: boolean, is_visible?: boolean, is_subscribed?: boolean }
 */
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const live_stream_id = Number(body?.live_stream_id);
    const viewer_id = body?.viewer_id as string | undefined;

    if (!live_stream_id || !viewer_id) {
      return NextResponse.json({ error: 'live_stream_id and viewer_id are required' }, { status: 400 });
    }

    // CRITICAL: active_viewers.streamer_id is NOT NULL in production.
    // Always resolve streamer_id from live_streams.profile_id.
    const { data: liveStreamRow, error: liveStreamErr } = await supabase
      .from('live_streams')
      .select('profile_id')
      .eq('id', live_stream_id)
      .maybeSingle();

    const streamer_id = (liveStreamRow as any)?.profile_id as string | undefined;

    // If we cannot resolve streamer_id, NEVER hard-fail this endpoint.
    // Return 200 and skip so viewer playback isn't impacted by periodic errors.
    if (liveStreamErr || !streamer_id) {
      console.warn('[active-viewers/heartbeat] Skipping upsert: unable to resolve streamer_id', {
        live_stream_id,
        hasViewerId: !!viewer_id,
        liveStreamErr: liveStreamErr ? { code: (liveStreamErr as any).code, message: liveStreamErr.message } : null,
        hasStreamerId: !!streamer_id,
      });
      return NextResponse.json({ success: true, skipped: true }, { status: 200 });
    }

    const is_active = body?.is_active ?? true;
    const is_unmuted = body?.is_unmuted ?? true;
    const is_visible = body?.is_visible ?? true;
    const is_subscribed = body?.is_subscribed ?? true;

    const { error } = await supabase.from('active_viewers').upsert(
      {
        streamer_id,
        live_stream_id,
        viewer_id,
        is_active,
        is_unmuted,
        is_visible,
        is_subscribed,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'live_stream_id,viewer_id' }
    );

    if (error) {
      console.error('[active-viewers/heartbeat] Upsert error:', error);
      // NEVER hard-fail this endpoint; treat as best-effort.
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[active-viewers/heartbeat] Exception:', err);
    // NEVER hard-fail this endpoint; treat as best-effort.
    return NextResponse.json({ success: false, error: String(err) }, { status: 200 });
  }
}
