import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/rooms - List all rooms (public, non-draft)
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: rooms, error } = await supabase
      .from('coming_soon_rooms')
      .select('*')
      .neq('status', 'draft')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[API /rooms] Error fetching rooms:', error);
      return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }

    return NextResponse.json({ rooms: rooms || [] });
  } catch (err) {
    console.error('[API /rooms] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
