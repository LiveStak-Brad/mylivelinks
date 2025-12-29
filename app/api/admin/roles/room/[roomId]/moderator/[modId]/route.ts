import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireCanManageRoomRoles } from '@/lib/rbac';

// DELETE /api/admin/roles/room/[roomId]/moderator/[modId] - Remove a room moderator
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; modId: string } }
) {
  try {
    await requireCanManageRoomRoles({ request, roomId: params.roomId });
    const supabase = createRouteHandlerClient(request);

    const { roomId, modId } = params;

    const { error } = await supabase.rpc('revoke_room_moderator', {
      p_room_id: roomId,
      p_target_profile_id: modId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/roles/room/[roomId]/moderator/[modId]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

