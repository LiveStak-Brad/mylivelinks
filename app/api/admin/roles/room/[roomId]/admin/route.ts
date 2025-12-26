import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// POST /api/admin/roles/room/[roomId]/admin - Add a room admin
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // TODO: Implement actual role assignment in database
    console.log(`[Roles] Adding room admin to ${roomId}: ${user_id}`);

    return NextResponse.json({ success: true, message: 'Room admin added (stub)' });
  } catch (err) {
    console.error('[API /admin/roles/room/[roomId]/admin] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

