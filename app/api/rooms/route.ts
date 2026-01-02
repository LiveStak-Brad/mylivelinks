import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/rooms - List rooms for "Coming Soon" carousel (gauging interest only)
// Live rooms appear in LiveTV, not here
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Only show rooms that are gauging interest (not live, paused, or draft)
    // Status 'interest' and 'opening_soon' are for the Coming Soon carousel
    const { data: rows, error } = await supabase
      .from('v_rooms_public')
      .select('*')
      .in('status', ['interest', 'opening_soon'])
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
