import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Returns active viewer count for a live stream using service role (bypasses RLS)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const liveStreamId = searchParams.get('live_stream_id');

  if (!liveStreamId) {
    return NextResponse.json({ error: 'live_stream_id is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { count, error } = await supabase
      .from('active_viewers')
      .select('*', { count: 'exact', head: true })
      .eq('live_stream_id', Number(liveStreamId))
      .eq('is_active', true)
      .gt('last_active_at', new Date(Date.now() - 60_000).toISOString());

    if (error) {
      console.error('[active-viewers] Count error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ viewer_count: count || 0 });
  } catch (err: any) {
    console.error('[active-viewers] Exception:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
