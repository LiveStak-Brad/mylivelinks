import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAppAdmin } from '@/lib/rbac';

function toSlugKey(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || 'template';
}

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

// GET /api/admin/templates - List all room templates
export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const supabase = createRouteHandlerClient(request);

    const { data: templates, error } = await supabase
      .from('room_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /admin/templates] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: (templates || []).map(normalizeTemplateRow) });
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

    if (!name) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    const flags: Record<string, any> = {
      ...(typeof default_feature_flags === 'object' && default_feature_flags ? default_feature_flags : {}),
    };

    if (typeof gifts_enabled === 'boolean') flags.gifts_enabled = gifts_enabled;
    if (typeof chat_enabled === 'boolean') flags.chat_enabled = chat_enabled;
    if (typeof default_fallback_gradient === 'string' && default_fallback_gradient) {
      flags.fallback_gradient = default_fallback_gradient;
    }
    if (typeof default_theme_color === 'string' && default_theme_color) {
      flags.theme_color = default_theme_color;
    }

    const inferredKey = typeof template_key === 'string' && template_key.trim() ? template_key.trim() : toSlugKey(name);

    const { data: template, error } = await supabase
      .from('room_templates')
      .insert({
        template_key: inferredKey,
        name,
        description: description || null,
        layout_type: layout_type || 'grid',
        default_max_participants: default_max_participants ?? 12,
        default_status: default_status || 'interest',
        default_interest_threshold: default_interest_threshold ?? 500,
        default_category: default_category || 'entertainment',
        default_disclaimer_required: default_disclaimer_required ?? false,
        default_disclaimer_text: default_disclaimer_text || null,
        default_feature_flags: flags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[API /admin/templates] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template: normalizeTemplateRow(template) });
  } catch (err) {
    return authErrorToResponse(err);
  }
}


