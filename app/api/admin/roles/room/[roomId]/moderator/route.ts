import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireCanAssignRoomModerator } from '@/lib/rbac';

// POST /api/admin/roles/room/[roomId]/moderator - Add a room moderator
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await requireCanAssignRoomModerator({ request, roomId: params.roomId });
    const supabase = createRouteHandlerClient(request);

    const { roomId } = params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { error } = await supabase.rpc('grant_room_moderator', {
      p_room_id: roomId,
      p_target_profile_id: user_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/roles/room/[roomId]/moderator] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

