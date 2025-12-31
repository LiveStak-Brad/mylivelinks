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

    const is_active = body?.is_active ?? true;
    const is_unmuted = body?.is_unmuted ?? true;
    const is_visible = body?.is_visible ?? true;
    const is_subscribed = body?.is_subscribed ?? true;

    const { error } = await supabase.from('active_viewers').upsert(
      {
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[active-viewers/heartbeat] Exception:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
