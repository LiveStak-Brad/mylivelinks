import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAppAdmin, requireUser } from '@/lib/rbac';

function normalizeTemplateRow(row: any) {
  const flags = (row?.default_feature_flags ?? {}) as Record<string, any>;
  return {
    ...row,
    gifts_enabled: flags.gifts_enabled ?? flags.gifts ?? true,
    chat_enabled: flags.chat_enabled ?? flags.chat ?? true,
    default_fallback_gradient: flags.fallback_gradient ?? row?.default_fallback_gradient ?? 'from-purple-600 to-pink-600',
    default_theme_color: flags.theme_color ?? row?.default_theme_color ?? null,
  };
}

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// GET /api/admin/templates/[templateId] - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    await requireAppAdmin(request);
    const { templateId } = await params;
    const supabase = createRouteHandlerClient(request);

    const { data: template, error } = await supabase
      .from('room_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template: normalizeTemplateRow(template) });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

// PUT /api/admin/templates/[templateId] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    await requireAppAdmin(request);
    const { templateId } = await params;
    const supabase = createRouteHandlerClient(request);

    const body = await request.json();
    const {
      template_key,
      name,
      description,
      layout_type,
      default_max_participants,
      default_status,
      default_interest_threshold,
      default_category,
      default_disclaimer_required,
      default_disclaimer_text,
      default_feature_flags,
      gifts_enabled,
      chat_enabled,
      default_fallback_gradient,
      default_theme_color,
    } = body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    // Load current flags so we can merge
    const { data: existing } = await supabase
      .from('room_templates')
      .select('default_feature_flags')
      .eq('id', templateId)
      .single();

    const mergedFlags: Record<string, any> = {
      ...((existing?.default_feature_flags as any) || {}),
      ...((typeof default_feature_flags === 'object' && default_feature_flags ? default_feature_flags : {}) as any),
    };

    if (typeof gifts_enabled === 'boolean') mergedFlags.gifts_enabled = gifts_enabled;
    if (typeof chat_enabled === 'boolean') mergedFlags.chat_enabled = chat_enabled;
    if (typeof default_fallback_gradient === 'string' && default_fallback_gradient) {
      mergedFlags.fallback_gradient = default_fallback_gradient;
    }
    if (typeof default_theme_color === 'string' && default_theme_color) {
      mergedFlags.theme_color = default_theme_color;
    }

    updates.default_feature_flags = mergedFlags;

    if (template_key !== undefined) updates.template_key = template_key;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (layout_type !== undefined) updates.layout_type = layout_type;
    if (default_max_participants !== undefined) updates.default_max_participants = default_max_participants;
    if (default_status !== undefined) updates.default_status = default_status;
    if (default_interest_threshold !== undefined) updates.default_interest_threshold = default_interest_threshold;
    if (default_category !== undefined) updates.default_category = default_category;
    if (default_disclaimer_required !== undefined) updates.default_disclaimer_required = default_disclaimer_required;
    if (default_disclaimer_text !== undefined) updates.default_disclaimer_text = default_disclaimer_text;

    const { data: template, error } = await supabase
      .from('room_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('[API /admin/templates/[id]] Update error:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ template: normalizeTemplateRow(template) });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ templateId: string }> }
) {
  return PUT(request, ctx);
}

// DELETE /api/admin/templates/[templateId] - Soft delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await requireUser(request);
    const { templateId } = await params;
    const supabase = createRouteHandlerClient(request);

    const { data: isOwner } = await supabase.rpc('is_owner', { p_profile_id: user.id });
    if (isOwner !== true) {
      return NextResponse.json({ error: 'Only owners can delete templates' }, { status: 403 });
    }

    const { count } = await supabase
      .from('rooms')
      .select('*', { head: true, count: 'exact' })
      .eq('template_id', templateId);

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Template is in use by rooms' }, { status: 409 });
    }

    const { error } = await supabase.from('room_templates').delete().eq('id', templateId);

    if (error) {
      console.error('[API /admin/templates/[id]] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

// POST /api/admin/templates/[templateId] - Duplicate template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await requireAppAdmin(request);
    const { templateId } = await params;
    const supabase = createRouteHandlerClient(request);

    // Get original template
    const { data: original, error: fetchError } = await supabase
      .from('room_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create duplicate
    const { data: duplicate, error: insertError } = await supabase
      .from('room_templates')
      .insert({
        template_key: `${original.template_key}_copy_${Date.now()}`,
        name: `${original.name} (Copy)`,
        description: original.description,
        layout_type: original.layout_type,
        default_max_participants: original.default_max_participants,
        default_status: original.default_status,
        default_interest_threshold: original.default_interest_threshold,
        default_category: original.default_category,
        default_disclaimer_required: original.default_disclaimer_required,
        default_disclaimer_text: original.default_disclaimer_text,
        default_feature_flags: original.default_feature_flags ?? {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API /admin/templates/[id]] Duplicate error:', insertError);
      return NextResponse.json({ error: 'Failed to duplicate template' }, { status: 500 });
    }

    return NextResponse.json({ template: normalizeTemplateRow(duplicate) });
  } catch (err) {
    return authErrorToResponse(err);
  }
}




