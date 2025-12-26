import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomId = params.roomId;
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const interested = !!body?.interested;

    if (interested) {
      const { error } = await supabase
        .from('room_interest')
        .upsert(
          {
            room_id: roomId,
            profile_id: user.id,
          },
          {
            onConflict: 'room_id,profile_id',
          }
        );

      if (error) {
        console.error('[ROOMS] interest upsert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('room_interest')
        .delete()
        .eq('room_id', roomId)
        .eq('profile_id', user.id);

      if (error) {
        console.error('[ROOMS] interest delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('current_interest_count')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('[ROOMS] read count error:', roomError);
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        current_interest_count: room?.current_interest_count ?? 0,
        interested,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[ROOMS] interest exception:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
