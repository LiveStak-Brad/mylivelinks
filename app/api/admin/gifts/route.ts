import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();

    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from('gifts')
      .select(
        'id, sender_id, recipient_id, gift_type_id, coin_amount, platform_revenue, streamer_revenue, slot_index, live_stream_id, sent_at, sender:profiles!gifts_sender_id_fkey(username, display_name), recipient:profiles!gifts_recipient_id_fkey(username, display_name)'
      )
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let gifts = (data ?? []) as any[];
    if (q) {
      gifts = gifts.filter((g) => {
        const s = (g.sender?.username || g.sender?.display_name || '').toString().toLowerCase();
        const r = (g.recipient?.username || g.recipient?.display_name || '').toString().toLowerCase();
        return s.includes(q) || r.includes(q);
      });
    }

    return NextResponse.json({ gifts, limit, offset });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
