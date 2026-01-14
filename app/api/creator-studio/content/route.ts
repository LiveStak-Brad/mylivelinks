import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null;
    const itemType = searchParams.get('type') || null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { data, error } = await supabase.rpc('list_creator_studio_items', {
      p_status: status,
      p_item_type: itemType,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error('GET /api/creator-studio/content error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { title, item_type, rights_attested, description, visibility } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!item_type || typeof item_type !== 'string') {
      return NextResponse.json({ error: 'Item type is required' }, { status: 400 });
    }

    if (!rights_attested) {
      return NextResponse.json({ error: 'Rights attestation is required' }, { status: 400 });
    }

    const { data: itemId, error } = await supabase.rpc('create_creator_studio_item', {
      p_title: title.trim(),
      p_item_type: item_type,
      p_rights_attested: true,
      p_description: description?.trim() || null,
      p_visibility: visibility || 'private',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: itemId }, { status: 201 });
  } catch (err) {
    console.error('POST /api/creator-studio/content error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
