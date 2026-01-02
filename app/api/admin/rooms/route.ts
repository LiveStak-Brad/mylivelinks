import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAppAdmin, requireUser } from '@/lib/rbac';

function normalizeRoomRow(row: any) {
  const flags = (row?.effective_feature_flags ?? row?.feature_flags ?? {}) as Record<string, any>;
  return {
    ...row,
    // UI compatibility: owner panel expects these fields directly
    interest_threshold: row?.effective_interest_threshold ?? row?.interest_threshold ?? null,
    max_participants: row?.effective_max_participants ?? row?.max_participants ?? null,
    disclaimer_required: row?.effective_disclaimer_required ?? row?.disclaimer_required ?? null,
    disclaimer_text: row?.effective_disclaimer_text ?? row?.disclaimer_text ?? null,
    layout_type: row?.layout_type ?? null,
    gifts_enabled: flags.gifts_enabled ?? flags.gifts ?? true,
    chat_enabled: flags.chat_enabled ?? flags.chat ?? true,
    fallback_gradient:
      row?.fallback_gradient ?? flags.fallback_gradient ?? row?.default_fallback_gradient ?? 'from-purple-600 to-pink-600',
    theme_color: row?.theme_color ?? flags.theme_color ?? row?.default_theme_color ?? null,
  };
}

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
        .from('v_rooms_effective')
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
        .from('v_rooms_effective')
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
      ...normalizeRoomRow(room),
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
      template_id,
      name,
      description,
      category,
      banner_url,
      image_url,
      fallback_gradient,
      interest_threshold,
      status,
      display_order,
      disclaimer_required,
      disclaimer_text,
      special_badge,
      max_participants,
      theme_color,
      background_image,
      subtitle,
      feature_flags,
      gifts_enabled,
      chat_enabled,
      // New fields for room type/visibility
      room_type,
      visibility,
      team_id,
      admin_profile_id,
    } = body;

    if (!room_key || !name) {
      return NextResponse.json({ error: 'Missing required fields (room_key, name)' }, { status: 400 });
    }

    // If template_id not provided, fall back to default template (migration seeds this)
    let resolvedTemplateId = typeof template_id === 'string' ? template_id : null;
    if (!resolvedTemplateId) {
      const { data: defaultTemplate } = await supabase
        .from('room_templates')
        .select('id')
        .eq('template_key', 'default_grid_12')
        .single();
      resolvedTemplateId = defaultTemplate?.id ?? null;
    }

    const flags: Record<string, any> = {
      ...(typeof feature_flags === 'object' && feature_flags ? feature_flags : {}),
    };
    if (typeof gifts_enabled === 'boolean') flags.gifts_enabled = gifts_enabled;
    if (typeof chat_enabled === 'boolean') flags.chat_enabled = chat_enabled;

    // Get current user for admin_profile_id default
    const { data: { user } } = await supabase.auth.getUser();

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        room_key,
        slug: room_key, // Set slug same as room_key
        template_id: resolvedTemplateId,
        name,
        description: description || null,
        category: category || 'entertainment',
        banner_url: banner_url || null,
        image_url: image_url || null,
        fallback_gradient: fallback_gradient || null,
        theme_color: theme_color || null,
        background_image: background_image || null,
        subtitle: subtitle || null,
        special_badge: special_badge || null,
        display_order: display_order || 0,
        interest_threshold: typeof interest_threshold === 'number' ? interest_threshold : null,
        max_participants: typeof max_participants === 'number' ? max_participants : null,
        status: status || 'interest',
        disclaimer_required: typeof disclaimer_required === 'boolean' ? disclaimer_required : null,
        disclaimer_text: disclaimer_text || null,
        feature_flags: Object.keys(flags).length ? flags : null,
        // New fields
        room_type: room_type || 'official',
        visibility: visibility || 'public',
        team_id: team_id || null,
        admin_profile_id: admin_profile_id || user?.id || null,
        grid_size: typeof max_participants === 'number' ? max_participants : 12,
        chat_enabled: typeof chat_enabled === 'boolean' ? chat_enabled : true,
        gifting_enabled: typeof gifts_enabled === 'boolean' ? gifts_enabled : true,
      })
      .select()
      .single();

    if (error) {
      console.error('[API /admin/rooms] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    // Add the creator (or specified admin) as room_admin in room_roles table
    const adminToAdd = admin_profile_id || user?.id;
    if (adminToAdd && room?.id) {
      const { error: roleError } = await supabase.rpc('grant_room_admin', {
        p_room_id: room.id,
        p_target_profile_id: adminToAdd,
      });
      if (roleError) {
        console.warn('[API /admin/rooms] Failed to grant room admin role:', roleError);
      }
    }

    // Return the enriched effective row so the UI has layout_type and effective overrides
    const { data: effective } = await supabase
      .from('v_rooms_effective')
      .select('*')
      .eq('id', room.id)
      .single();

    return NextResponse.json({ room: normalizeRoomRow(effective || room) });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
