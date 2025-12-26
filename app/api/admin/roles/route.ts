import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// GET /api/admin/roles - Get all roles (app admins + room roles)
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return mock data
    // TODO: Replace with actual database queries when roles tables are created
    const mockAppAdmins = [
      {
        id: 'owner-1',
        profile_id: user.id,
        username: 'owner',
        display_name: 'Site Owner',
        avatar_url: null,
        role: 'owner',
        created_at: new Date().toISOString(),
      },
    ];

    // Get rooms for room roles
    const { data: rooms } = await supabase
      .from('coming_soon_rooms')
      .select('id, name')
      .order('display_order', { ascending: true });

    const roomsWithRoles = (rooms || []).map((room: any) => ({
      id: room.id,
      name: room.name,
      admins: [],
      moderators: [],
    }));

    return NextResponse.json({
      app_admins: mockAppAdmins,
      rooms: roomsWithRoles,
    });
  } catch (err) {
    console.error('[API /admin/roles] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

