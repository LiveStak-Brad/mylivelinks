import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireUser } from '@/lib/rbac';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);

    const q = (url.searchParams.get('q') || '').trim();
    const roomId = (url.searchParams.get('roomId') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const supabase = createRouteHandlerClient(request);

    // Authorization: app admins can search; room admins can search with roomId context
    const { data: isAppAdmin } = await supabase.rpc('is_app_admin', { p_profile_id: user.id });

    if (isAppAdmin !== true) {
      if (!roomId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const { data: isRoomAdmin } = await supabase.rpc('is_room_admin', {
        p_profile_id: user.id,
        p_room_id: roomId,
      });

      if (isRoomAdmin !== true) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const escaped = q.replace(/,/g, '');

    const { data, error } = await admin
      .from('profiles')
      .select('id, username, avatar_url')
      .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ users: data ?? [] }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
