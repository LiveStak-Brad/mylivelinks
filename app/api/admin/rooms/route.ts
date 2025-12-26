import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAppAdmin, requireUser } from '@/lib/rbac';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// GET /api/admin/rooms - List all rooms (including drafts) for admin
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const supabase = createRouteHandlerClient(request);

    const { data: isAppAdmin } = await supabase.rpc('is_app_admin', { p_profile_id: user.id });

    let rooms: any[] = [];
    if (isAppAdmin === true) {
      const { data, error } = await supabase
        .from('coming_soon_rooms')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[API /admin/rooms] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
      }

      rooms = data || [];
    } else {
      const { data: myRoomRoles, error: myRoomRolesError } = await supabase
        .from('room_roles')
        .select('room_id')
        .eq('profile_id', user.id)
        .in('role', ['room_admin', 'room_moderator']);

      if (myRoomRolesError) {
        return NextResponse.json({ error: myRoomRolesError.message }, { status: 403 });
      }

      const roomIds = Array.from(new Set((myRoomRoles || []).map((r: any) => r.room_id)));
      if (roomIds.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { data, error } = await supabase
        .from('coming_soon_rooms')
        .select('*')
        .in('id', roomIds)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[API /admin/rooms] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
      }

      rooms = data || [];
    }

    const roomIds = rooms.map((r: any) => r.id);
    const rolesSummaryByRoomId = new Map<string, { admins_count: number; moderators_count: number }>();

    if (roomIds.length > 0) {
      const { data: roles } = await supabase
        .from('room_roles')
        .select('room_id, role')
        .in('room_id', roomIds);

      for (const roomId of roomIds) {
        rolesSummaryByRoomId.set(roomId, { admins_count: 0, moderators_count: 0 });
      }

      for (const rr of (roles as any[]) || []) {
        const current = rolesSummaryByRoomId.get(rr.room_id) || { admins_count: 0, moderators_count: 0 };
        if (rr.role === 'room_admin') current.admins_count += 1;
        if (rr.role === 'room_moderator') current.moderators_count += 1;
        rolesSummaryByRoomId.set(rr.room_id, current);
      }
    }

    const enriched = rooms.map((room: any) => ({
      ...room,
      roles_summary: rolesSummaryByRoomId.get(room.id) || { admins_count: 0, moderators_count: 0 },
    }));

    return NextResponse.json({ rooms: enriched });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

// POST /api/admin/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const supabase = createRouteHandlerClient(request);

    const body = await request.json();
    const {
      room_key,
      name,
      description,
      category,
      image_url,
      fallback_gradient,
      interest_threshold,
      status,
      display_order,
      disclaimer_required,
      disclaimer_text,
      special_badge,
    } = body;

    if (!room_key || !name || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: room, error } = await supabase
      .from('coming_soon_rooms')
      .insert({
        room_key,
        name,
        description: description || null,
        category,
        image_url: image_url || null,
        fallback_gradient: fallback_gradient || 'from-purple-600 to-pink-600',
        interest_threshold: interest_threshold || 5000,
        status: status || 'interest',
        display_order: display_order || 0,
        disclaimer_required: disclaimer_required || false,
        disclaimer_text: disclaimer_text || null,
        special_badge: special_badge || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[API /admin/rooms] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    return NextResponse.json({ room });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
