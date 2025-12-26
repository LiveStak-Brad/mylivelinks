import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAppAdmin } from '@/lib/rbac';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// GET /api/admin/templates - List all room templates
export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const supabase = createRouteHandlerClient(request);

    const { data: templates, error } = await supabase
      .from('room_templates')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /admin/templates] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

// POST /api/admin/templates - Create a new room template
export async function POST(request: NextRequest) {
  try {
    const user = await requireAppAdmin(request);
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

    if (!name) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    const { data: template, error } = await supabase
      .from('room_templates')
      .insert({
        name,
        description: description || null,
        layout_type: layout_type || 'grid',
        default_max_participants: default_max_participants ?? 12,
        default_status: default_status || 'interest',
        default_interest_threshold: default_interest_threshold ?? 5000,
        default_category: default_category || 'entertainment',
        default_disclaimer_required: default_disclaimer_required ?? false,
        default_disclaimer_text: default_disclaimer_text || null,
        gifts_enabled: gifts_enabled ?? true,
        chat_enabled: chat_enabled ?? true,
        default_fallback_gradient: default_fallback_gradient || 'from-purple-600 to-pink-600',
        default_theme_color: default_theme_color || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[API /admin/templates] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

