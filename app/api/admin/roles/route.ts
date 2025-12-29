import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAppAdmin } from '@/lib/rbac';

// GET /api/admin/roles - Get all roles (app admins + room roles)
export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const supabase = createRouteHandlerClient(request);

    const [{ data: rooms, error: roomsError }, { data: appRoles, error: appRolesError }, { data: roomRoles, error: roomRolesError }] =
      await Promise.all([
        supabase
          .from('rooms')
          .select('id, name')
          .order('display_order', { ascending: true }),
        supabase
          .from('app_roles')
          .select('profile_id, role, created_at, created_by')
          .in('role', ['owner', 'app_admin'])
          .order('created_at', { ascending: false }),
        supabase
          .from('room_roles')
          .select('room_id, profile_id, role, created_at, created_by')
          .in('role', ['room_admin', 'room_moderator'])
          .order('created_at', { ascending: false }),
      ]);

    if (roomsError) return NextResponse.json({ error: roomsError.message }, { status: 500 });
    if (appRolesError) return NextResponse.json({ error: appRolesError.message }, { status: 500 });
    if (roomRolesError) return NextResponse.json({ error: roomRolesError.message }, { status: 500 });

    const profileIds = Array.from(
      new Set([...(appRoles || []).map((r: any) => r.profile_id), ...(roomRoles || []).map((r: any) => r.profile_id)])
    );
    const createdByIds = Array.from(
      new Set([...(appRoles || []).map((r: any) => r.created_by), ...(roomRoles || []).map((r: any) => r.created_by)].filter(Boolean))
    );

    const admin = getSupabaseAdmin();
    const [{ data: profiles }, { data: creators }] = await Promise.all([
      profileIds.length
        ? admin.from('profiles').select('id, username, display_name, avatar_url').in('id', profileIds)
        : Promise.resolve({ data: [] as any[] } as any),
      createdByIds.length
        ? admin.from('profiles').select('id, username, display_name, avatar_url').in('id', createdByIds)
        : Promise.resolve({ data: [] as any[] } as any),
    ]);

    const profileById = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
    const creatorById = new Map<string, any>((creators || []).map((p: any) => [p.id, p]));

    const app_admins = (appRoles || [])
      .filter((r: any) => r.role === 'app_admin')
      .map((r: any) => ({
        profile_id: r.profile_id,
        role: r.role,
        created_at: r.created_at,
        created_by: r.created_by,
        profile: profileById.get(r.profile_id) || null,
        created_by_profile: r.created_by ? creatorById.get(r.created_by) || null : null,
      }));

    const owners = (appRoles || [])
      .filter((r: any) => r.role === 'owner')
      .map((r: any) => ({
        profile_id: r.profile_id,
        role: r.role,
        created_at: r.created_at,
        created_by: r.created_by,
        profile: profileById.get(r.profile_id) || null,
        created_by_profile: r.created_by ? creatorById.get(r.created_by) || null : null,
      }));

    const roomsById = new Map<string, any>((rooms || []).map((r: any) => [r.id, { ...r, admins: [], moderators: [] }]));

    for (const rr of (roomRoles || []) as any[]) {
      const room = roomsById.get(rr.room_id);
      if (!room) continue;

      const entry = {
        room_id: rr.room_id,
        profile_id: rr.profile_id,
        role: rr.role,
        created_at: rr.created_at,
        created_by: rr.created_by,
        profile: profileById.get(rr.profile_id) || null,
        created_by_profile: rr.created_by ? creatorById.get(rr.created_by) || null : null,
      };

      if (rr.role === 'room_admin') room.admins.push(entry);
      if (rr.role === 'room_moderator') room.moderators.push(entry);
    }

    return NextResponse.json(
      {
        owners,
        app_admins,
        rooms: Array.from(roomsById.values()),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[API /admin/roles] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
