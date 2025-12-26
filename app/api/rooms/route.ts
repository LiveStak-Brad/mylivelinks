import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// GET /api/rooms - List all rooms (public, non-draft)
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    const { data: rows, error } = await supabase
      .from('v_rooms_public')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[API /rooms] Error fetching rooms:', error);
      return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }

    const rooms = (rows || []).map((r: any) => ({
      ...r,
      // UI compatibility: existing components expect interest_threshold
      interest_threshold: r.effective_interest_threshold,
    }));

    return NextResponse.json({ rooms: rooms || [] });
  } catch (err) {
    console.error('[API /rooms] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
