import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireCanManageRoomRoles, requireUser } from '@/lib/rbac';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const user = await requireUser(request);
    const { roomId } = await params;
    if (!roomId) return NextResponse.json({ error: 'roomId is required' }, { status: 400 });

    // Allow app admins and room role holders to view roles for this room
    const supabase = createRouteHandlerClient(request);
    const { data: isAppAdmin } = await supabase.rpc('is_app_admin', { p_profile_id: user.id });
    if (isAppAdmin !== true) {
      const { data: myRole, error: myRoleError } = await supabase
        .from('room_roles')
        .select('role')
        .eq('room_id', roomId)
        .eq('profile_id', user.id)
        .limit(1);

      if (myRoleError || (myRole || []).length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: roles, error } = await supabase
      .from('room_roles')
      .select('room_id, profile_id, role, created_at, created_by')
      .eq('room_id', roomId)
      .in('role', ['room_admin', 'room_moderator'])
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const profileIds = Array.from(new Set((roles || []).map((r: any) => r.profile_id)));
    const createdByIds = Array.from(new Set((roles || []).map((r: any) => r.created_by).filter(Boolean)));

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

    const admins = (roles || [])
      .filter((r: any) => r.role === 'room_admin')
      .map((r: any) => ({
        ...r,
        profile: profileById.get(r.profile_id) || null,
        created_by_profile: r.created_by ? creatorById.get(r.created_by) || null : null,
      }));

    const moderators = (roles || [])
      .filter((r: any) => r.role === 'room_moderator')
      .map((r: any) => ({
        ...r,
        profile: profileById.get(r.profile_id) || null,
        created_by_profile: r.created_by ? creatorById.get(r.created_by) || null : null,
      }));

    return NextResponse.json({ admins, moderators }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    await requireCanManageRoomRoles({ request, roomId });

    const body = await request.json().catch(() => null);
    const profileId = typeof body?.profileId === 'string' ? body.profileId : null;
    const role = typeof body?.role === 'string' ? body.role : null;

    if (!profileId || !role) {
      return NextResponse.json({ error: 'profileId and role are required' }, { status: 400 });
    }

    if (role !== 'room_admin' && role !== 'room_moderator') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);
    const fn = role === 'room_admin' ? 'grant_room_admin' : 'grant_room_moderator';

    const { error } = await (supabase as any).rpc(fn, {
      p_room_id: roomId,
      p_target_profile_id: profileId,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 403 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
