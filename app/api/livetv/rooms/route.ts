import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const admin = getSupabaseAdmin();

    // Fetch live rooms using the RPC
    const { data: rooms, error } = await admin.rpc('rpc_get_live_rooms');

    if (error) {
      console.error('[LiveTV Rooms API] RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to LiveTV room format
    const normalized = (rooms || []).map((room: any) => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description || null,
      room_type: room.room_type || 'official',
      icon_url: room.icon_url || null,
      banner_url: room.banner_url || null,
      viewer_count: room.current_viewer_count || 0,
      streamer_count: room.current_streamer_count || 0,
      category: room.category || 'entertainment',
    }));

    return NextResponse.json(
      { rooms: normalized },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (err: any) {
    console.error('[LiveTV Rooms API] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
