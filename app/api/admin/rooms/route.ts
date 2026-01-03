import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { generateReqId } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireUser } from '@/lib/rbac';

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

function slugifyRoomKey(input: string) {
  const base = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const safe = base || 'room';
  const suffix = Math.random().toString(16).slice(2, 8);
  return `${safe.slice(0, 48)}-${suffix}`;
}

function extFromMime(mime: string) {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  return null;
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
    const reqId = generateReqId();
    const actor = await requireUser(request);
    const supabase = createRouteHandlerClient(request);

    const { data: isAppAdmin } = await supabase.rpc('is_app_admin', { p_profile_id: actor.id });
    const isAdmin = isAppAdmin === true;

    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.toLowerCase().includes('multipart/form-data');

    let body: any = null;
    let uploadImage: File | null = null;

    if (isMultipart) {
      const fd = await request.formData();
      uploadImage = (fd.get('image') as File | null) ?? null;
      body = {
        name: fd.get('name'),
        category: fd.get('category'),
        subtitle: fd.get('subtitle'),
        description: fd.get('description'),
        why: fd.get('why'),
      };
    } else {
      body = await request.json();
    }

    console.info('[API /admin/rooms] reqId=%s start isAdmin=%s multipart=%s', reqId, String(isAdmin), String(isMultipart));

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
      why,
    } = body || {};

    const effectiveName = typeof name === 'string' ? name.trim() : '';
    const effectiveCategory = typeof category === 'string' ? category.trim() : '';

    const isUserRoomIdea = !isAdmin;
    const effectiveRoomKey = isAdmin
      ? (typeof room_key === 'string' ? room_key.trim() : '')
      : (typeof room_key === 'string' && room_key.trim() ? room_key.trim() : slugifyRoomKey(effectiveName));

    if (!effectiveName) {
      return NextResponse.json({ error: 'Missing required field (name)', reqId }, { status: 400 });
    }

    if (isAdmin && !effectiveRoomKey) {
      return NextResponse.json({ error: 'Missing required fields (room_key, name)', reqId }, { status: 400 });
    }

    const userShortSubtitle = typeof subtitle === 'string' ? subtitle.trim() : '';
    const userShortDescription = typeof description === 'string' ? description.trim() : '';
    const userWhy = typeof why === 'string' ? why.trim() : '';

    if (isUserRoomIdea) {
      if (!effectiveCategory) {
        return NextResponse.json({ error: 'Missing required field (category)', reqId }, { status: 400 });
      }

      if (!userShortDescription) {
        return NextResponse.json({ error: 'Missing required field (description)', reqId }, { status: 400 });
      }

      if (!uploadImage) {
        return NextResponse.json({ error: 'Image is required', reqId }, { status: 400 });
      }

      if (!uploadImage.type?.startsWith('image/')) {
        return NextResponse.json({ error: 'Unsupported image type', reqId }, { status: 400 });
      }

      if (uploadImage.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image must be less than 5MB', reqId }, { status: 400 });
      }
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

    let resolvedImageUrl: string | null = typeof image_url === 'string' ? image_url : null;
    let resolvedBannerUrl: string | null = typeof banner_url === 'string' ? banner_url : null;

    if (isUserRoomIdea && uploadImage) {
      console.info('[API /admin/rooms] reqId=%s upload_start', reqId);
      const ext = extFromMime(uploadImage.type) || 'jpg';
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_ROOM_IMAGES_BUCKET || 'room-images';
      const path = `${effectiveRoomKey}/cover-${Date.now()}.${ext}`;
      const bytes = await uploadImage.arrayBuffer();
      const admin = getSupabaseAdmin();

      const { error: uploadError } = await admin.storage.from(bucket).upload(path, Buffer.from(bytes), {
        contentType: uploadImage.type,
        upsert: true,
        cacheControl: '3600',
      });

      if (uploadError) {
        console.error('[API /admin/rooms] reqId=%s upload_error', reqId, uploadError);
        return NextResponse.json({ error: uploadError.message || 'Failed to upload image', reqId }, { status: 500 });
      }

      const { data: urlData } = admin.storage.from(bucket).getPublicUrl(path);
      resolvedImageUrl = urlData?.publicUrl ?? null;
      resolvedBannerUrl = urlData?.publicUrl ?? null;

      if (!resolvedImageUrl) {
        return NextResponse.json({ error: 'Failed to get uploaded image URL', reqId }, { status: 500 });
      }
      console.info('[API /admin/rooms] reqId=%s upload_complete', reqId);
    }

    const flags: Record<string, any> = {
      ...(typeof feature_flags === 'object' && feature_flags ? feature_flags : {}),
    };
    if (typeof gifts_enabled === 'boolean') flags.gifts_enabled = gifts_enabled;
    if (typeof chat_enabled === 'boolean') flags.chat_enabled = chat_enabled;

    // Get current user for admin_profile_id default
    const { data: { user } } = await supabase.auth.getUser();

    const resolvedStatus = isAdmin ? (status || 'interest') : 'interest';
    const resolvedRoomType = isAdmin ? (room_type || 'official') : 'community';
    const resolvedVisibility = isAdmin ? (visibility || 'public') : 'public';
    const resolvedDisplayOrder = isAdmin
      ? (display_order || 0)
      : (typeof display_order === 'number' ? display_order : 9999);
    const resolvedDisclaimerRequired = isAdmin ? (typeof disclaimer_required === 'boolean' ? disclaimer_required : null) : null;
    const resolvedDisclaimerText = isAdmin ? (disclaimer_text || null) : null;
    const resolvedSpecialBadge = isAdmin ? (special_badge || null) : null;

    const resolvedSubtitle = isAdmin ? (subtitle || null) : (userShortSubtitle || null);
    const resolvedDescription = isAdmin
      ? (description || null)
      : `${userShortDescription}${userWhy ? `\n\nWhy this matters:\n${userWhy}` : ''}`;

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        room_key: effectiveRoomKey,
        slug: effectiveRoomKey, // Set slug same as room_key
        template_id: resolvedTemplateId,
        name: effectiveName,
        description: resolvedDescription || null,
        category: (effectiveCategory || 'entertainment'),
        banner_url: resolvedBannerUrl || null,
        image_url: resolvedImageUrl || null,
        fallback_gradient: fallback_gradient || null,
        theme_color: theme_color || null,
        background_image: background_image || null,
        subtitle: resolvedSubtitle || null,
        special_badge: resolvedSpecialBadge,
        display_order: resolvedDisplayOrder,
        interest_threshold: typeof interest_threshold === 'number' ? interest_threshold : null,
        max_participants: typeof max_participants === 'number' ? max_participants : null,
        status: resolvedStatus,
        disclaimer_required: resolvedDisclaimerRequired,
        disclaimer_text: resolvedDisclaimerText,
        feature_flags: Object.keys(flags).length ? flags : null,
        // New fields
        room_type: resolvedRoomType,
        visibility: resolvedVisibility,
        team_id: isAdmin ? (team_id || null) : null,
        admin_profile_id: isAdmin ? (admin_profile_id || user?.id || null) : (actor.id || null),
        grid_size: typeof max_participants === 'number' ? max_participants : 12,
        chat_enabled: typeof chat_enabled === 'boolean' ? chat_enabled : true,
        gifting_enabled: typeof gifts_enabled === 'boolean' ? gifts_enabled : true,
      })
      .select()
      .single();

    if (error) {
      console.error('[API /admin/rooms] reqId=%s insert_error', reqId, error);
      return NextResponse.json({ error: 'Failed to create room', reqId }, { status: 500 });
    }

    // Add the creator (or specified admin) as room_admin in room_roles table
    if (isAdmin) {
      const adminToAdd = admin_profile_id || user?.id;
      if (adminToAdd && room?.id) {
        const { error: roleError } = await supabase.rpc('grant_room_admin', {
          p_room_id: room.id,
          p_target_profile_id: adminToAdd,
        });
        if (roleError) {
          console.warn('[API /admin/rooms] reqId=%s grant_room_admin_failed', reqId, roleError);
        }
      }
    }

    // Return the enriched effective row so the UI has layout_type and effective overrides
    const { data: effective } = await supabase
      .from('v_rooms_effective')
      .select('*')
      .eq('id', room.id)
      .single();

    console.info('[API /admin/rooms] reqId=%s created room_id=%s', reqId, String(room.id));
    return NextResponse.json({ room: normalizeRoomRow(effective || room), reqId });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
