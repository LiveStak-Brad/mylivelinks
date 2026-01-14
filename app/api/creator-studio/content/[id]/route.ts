import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = params.id;

    const { data, error } = await supabase.rpc('get_creator_studio_item', {
      p_item_id: itemId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ item });
  } catch (err) {
    console.error('GET /api/creator-studio/content/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = params.id;
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { title, description, visibility, media_url, thumb_url, duration_seconds } = body;

    const { data: success, error } = await supabase.rpc('update_creator_studio_item', {
      p_item_id: itemId,
      p_title: title || null,
      p_description: description || null,
      p_visibility: visibility || null,
      p_media_url: media_url || null,
      p_thumb_url: thumb_url || null,
      p_duration_seconds: duration_seconds || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ error: 'Item not found or not owned by user' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/creator-studio/content/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthedRouteHandlerClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = params.id;

    const { data: success, error } = await supabase.rpc('delete_creator_studio_item', {
      p_item_id: itemId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ error: 'Item not found or not owned by user' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/creator-studio/content/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
