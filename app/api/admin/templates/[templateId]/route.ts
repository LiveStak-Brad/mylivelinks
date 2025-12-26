import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAppAdmin, requireUser } from '@/lib/rbac';

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
      .eq('is_deleted', false)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
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
      name,
      description,
      layout_type,
      default_max_participants,
      default_status,
      default_interest_threshold,
      default_category,
      default_disclaimer_required,
      default_disclaimer_text,
      gifts_enabled,
      chat_enabled,
      default_fallback_gradient,
      default_theme_color,
    } = body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (layout_type !== undefined) updates.layout_type = layout_type;
    if (default_max_participants !== undefined) updates.default_max_participants = default_max_participants;
    if (default_status !== undefined) updates.default_status = default_status;
    if (default_interest_threshold !== undefined) updates.default_interest_threshold = default_interest_threshold;
    if (default_category !== undefined) updates.default_category = default_category;
    if (default_disclaimer_required !== undefined) updates.default_disclaimer_required = default_disclaimer_required;
    if (default_disclaimer_text !== undefined) updates.default_disclaimer_text = default_disclaimer_text;
    if (gifts_enabled !== undefined) updates.gifts_enabled = gifts_enabled;
    if (chat_enabled !== undefined) updates.chat_enabled = chat_enabled;
    if (default_fallback_gradient !== undefined) updates.default_fallback_gradient = default_fallback_gradient;
    if (default_theme_color !== undefined) updates.default_theme_color = default_theme_color;

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

    return NextResponse.json({ template });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

// DELETE /api/admin/templates/[templateId] - Soft delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await requireAppAdmin(request);
    const { templateId } = await params;
    const supabase = createRouteHandlerClient(request);

    // Check if user is owner (only owners can delete templates)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_owner')
      .eq('id', user.id)
      .single();

    if (!profile?.is_owner) {
      return NextResponse.json({ error: 'Only owners can delete templates' }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from('room_templates')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', templateId);

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
      .eq('is_deleted', false)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create duplicate
    const { data: duplicate, error: insertError } = await supabase
      .from('room_templates')
      .insert({
        name: `${original.name} (Copy)`,
        description: original.description,
        layout_type: original.layout_type,
        default_max_participants: original.default_max_participants,
        default_status: original.default_status,
        default_interest_threshold: original.default_interest_threshold,
        default_category: original.default_category,
        default_disclaimer_required: original.default_disclaimer_required,
        default_disclaimer_text: original.default_disclaimer_text,
        gifts_enabled: original.gifts_enabled,
        chat_enabled: original.chat_enabled,
        default_fallback_gradient: original.default_fallback_gradient,
        default_theme_color: original.default_theme_color,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API /admin/templates/[id]] Duplicate error:', insertError);
      return NextResponse.json({ error: 'Failed to duplicate template' }, { status: 500 });
    }

    return NextResponse.json({ template: duplicate });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

