import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// GET /api/rooms/interests - Get current user's room interests
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: interests, error } = await supabase
      .from('room_interests')
      .select('room_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('[API /rooms/interests] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 });
    }

    const roomIds = (interests || []).map((i: { room_id: string }) => i.room_id);

    return NextResponse.json({ room_ids: roomIds });
  } catch (err) {
    console.error('[API /rooms/interests] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
