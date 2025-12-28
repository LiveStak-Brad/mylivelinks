import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';

export async function POST(request: NextRequest) {
  const supabase = createAuthedRouteHandlerClient(request);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const profileId = typeof body?.profileId === 'string' ? body.profileId : null;
  const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds.filter((x: any) => typeof x === 'string') : null;

  if (!orderedIds || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds is required' }, { status: 400 });
  }

  // Preferred (new canonical RPC): requires profileId; fallback to legacy RPC for older clients.
  const { error } = profileId
    ? await supabase.rpc('reorder_profile_music_videos', { p_profile_id: profileId, p_ordered_ids: orderedIds })
    : await supabase.rpc('reorder_music_videos', { p_ordered_ids: orderedIds });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
