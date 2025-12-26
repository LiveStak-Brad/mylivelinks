import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireCanManageRoomRoles } from '@/lib/rbac';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    await requireCanManageRoomRoles({ request, roomId });

    const body = await request.json().catch(() => null);
    const profileId = typeof body?.profileId === 'string' ? body.profileId : null;
    if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 });

    const supabase = createRouteHandlerClient(request);
    const { error } = await supabase.rpc('grant_room_admin', {
      p_room_id: roomId,
      p_target_profile_id: profileId,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    await requireCanManageRoomRoles({ request, roomId });

    const body = await request.json().catch(() => null);
    const profileId = typeof body?.profileId === 'string' ? body.profileId : null;
    if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 });

    const supabase = createRouteHandlerClient(request);
    const { error } = await supabase.rpc('revoke_room_admin', {
      p_room_id: roomId,
      p_target_profile_id: profileId,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
