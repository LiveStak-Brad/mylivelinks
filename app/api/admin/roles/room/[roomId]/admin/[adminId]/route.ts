import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// DELETE /api/admin/roles/room/[roomId]/admin/[adminId] - Remove a room admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; adminId: string } }
) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, adminId } = params;

    // TODO: Implement actual role removal in database
    console.log(`[Roles] Removing room admin ${adminId} from room ${roomId}`);

    return NextResponse.json({ success: true, message: 'Room admin removed (stub)' });
  } catch (err) {
    console.error('[API /admin/roles/room/[roomId]/admin/[adminId]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

