import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('room_interest')
      .select('room_id')
      .eq('profile_id', user.id);

    if (error) {
      console.error('[ROOMS] interests error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const roomIds = (data ?? []).map((r: any) => r.room_id);
    return NextResponse.json({ room_ids: roomIds }, { status: 200 });
  } catch (error: any) {
    console.error('[ROOMS] interests exception:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
