import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// POST /api/rooms/[roomId]/interest - Toggle interest for a room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = createRouteHandlerClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const interested = body.interested === true;

    if (interested) {
      // Add interest
      const { error: insertError } = await supabase
        .from('room_interest')
        .upsert(
          {
            room_id: roomId,
            profile_id: user.id,
          },
          { onConflict: 'room_id,profile_id' }
        );

      if (insertError) {
        console.error('[API /rooms/interest] Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to add interest' }, { status: 500 });
      }
    } else {
      // Remove interest
      const { error: deleteError } = await supabase
        .from('room_interest')
        .delete()
        .eq('room_id', roomId)
        .eq('profile_id', user.id);

      if (deleteError) {
        console.error('[API /rooms/interest] Delete error:', deleteError);
        return NextResponse.json({ error: 'Failed to remove interest' }, { status: 500 });
      }
    }

    // Fetch updated room to get new interest count
    const { data: room } = await supabase
      .from('rooms')
      .select('current_interest_count')
      .eq('id', roomId)
      .single();

    return NextResponse.json({
      interested,
      current_interest_count: room?.current_interest_count ?? 0,
    });
  } catch (err) {
    console.error('[API /rooms/interest] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
