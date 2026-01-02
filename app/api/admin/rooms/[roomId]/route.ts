import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireUser } from '@/lib/rbac';

function normalizeRoomRow(row: any) {
  const flags = (row?.effective_feature_flags ?? row?.feature_flags ?? {}) as Record<string, any>;
  return {
    ...row,
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

// Helper to resolve room by UUID or room_key and get the actual UUID
async function resolveRoomId(supabase: any, roomId: string): Promise<{ room: any; error: any }> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
  
  if (isUUID) {
    const result = await supabase
      .from('v_rooms_effective')
      .select('*')
      .eq('id', roomId)
      .single();
    if (result.data) return { room: result.data, error: null };
  }
  
  // Try by room_key
  const result = await supabase
    .from('v_rooms_effective')
    .select('*')
    .eq('room_key', roomId)
    .single();
  return { room: result.data, error: result.error };
}

// GET /api/admin/rooms/[roomId] - Get single room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = createRouteHandlerClient(request);
    const user = await requireUser(request);

    // First resolve the room to get the actual UUID
    const { room, error } = await resolveRoomId(supabase, roomId);
    
    if (error || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Now check permissions with the actual UUID
    const { data: canManage } = await supabase.rpc('is_room_admin', {
      p_profile_id: user.id,
      p_room_id: room.id,
    });

    if (canManage !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ room: normalizeRoomRow(room) });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

// PUT /api/admin/rooms/[roomId] - Update room
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = createRouteHandlerClient(request);
    const user = await requireUser(request);

    // Resolve the room to get the actual UUID
    const { room: existingRoom, error: resolveError } = await resolveRoomId(supabase, roomId);
    
    if (resolveError || !existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    const actualRoomId = existingRoom.id;

    const { data: canManage } = await supabase.rpc('is_room_admin', {
      p_profile_id: user.id,
      p_room_id: actualRoomId,
    });

    if (canManage !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      room_key,
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
    } = body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (room_key !== undefined) updates.room_key = room_key;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (banner_url !== undefined) updates.banner_url = banner_url;
    if (image_url !== undefined) updates.image_url = image_url;
    if (fallback_gradient !== undefined) updates.fallback_gradient = fallback_gradient;
    if (theme_color !== undefined) updates.theme_color = theme_color;
    if (background_image !== undefined) updates.background_image = background_image;
    if (subtitle !== undefined) updates.subtitle = subtitle;
    if (interest_threshold !== undefined) updates.interest_threshold = interest_threshold;
    if (max_participants !== undefined) updates.max_participants = max_participants;
    if (status !== undefined) updates.status = status;
    if (display_order !== undefined) updates.display_order = display_order;
    if (disclaimer_required !== undefined) updates.disclaimer_required = disclaimer_required;
    if (disclaimer_text !== undefined) updates.disclaimer_text = disclaimer_text;
    if (special_badge !== undefined) updates.special_badge = special_badge;

    // Merge feature flags if provided
    if (
      feature_flags !== undefined ||
      gifts_enabled !== undefined ||
      chat_enabled !== undefined
    ) {
      const { data: existing } = await supabase
        .from('rooms')
        .select('feature_flags')
        .eq('id', actualRoomId)
        .single();

      const merged: Record<string, any> = {
        ...((existing?.feature_flags as any) || {}),
        ...((typeof feature_flags === 'object' && feature_flags ? feature_flags : {}) as any),
      };

      if (typeof gifts_enabled === 'boolean') merged.gifts_enabled = gifts_enabled;
      if (typeof chat_enabled === 'boolean') merged.chat_enabled = chat_enabled;

      updates.feature_flags = Object.keys(merged).length ? merged : null;
    }

    const { data: room, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', actualRoomId)
      .select()
      .single();

    if (error) {
      console.error('[API /admin/rooms/[id]] Update error:', error);
      return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }

    const { data: effective } = await supabase
      .from('v_rooms_effective')
      .select('*')
      .eq('id', actualRoomId)
      .single();

    return NextResponse.json({ room: normalizeRoomRow(effective || room) });
  } catch (err) {
    console.error('[API /admin/rooms/[id]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/rooms/[roomId] - Delete room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = createRouteHandlerClient(request);
    const user = await requireUser(request);

    // Resolve the room to get the actual UUID
    const { room: existingRoom, error: resolveError } = await resolveRoomId(supabase, roomId);
    
    if (resolveError || !existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    const actualRoomId = existingRoom.id;

    const { data: isOwner } = await supabase.rpc('is_owner', { p_profile_id: user.id });
    if (isOwner !== true) {
      return NextResponse.json({ error: 'Only owners can delete rooms' }, { status: 403 });
    }

    const { data: canManage } = await supabase.rpc('is_room_admin', {
      p_profile_id: user.id,
      p_room_id: actualRoomId,
    });

    if (canManage !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', actualRoomId);

    if (error) {
      console.error('[API /admin/rooms/[id]] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
