import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Check if user is admin
async function isAdmin(supabase: any): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_owner')
    .eq('id', user.id)
    .single();

  return profile?.is_owner === true;
}

// GET /api/admin/rooms/[roomId] - Get single room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: room, error } = await supabase
      .from('coming_soon_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (err) {
    console.error('[API /admin/rooms/[id]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/rooms/[roomId] - Update room
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      room_key,
      name,
      description,
      category,
      image_url,
      fallback_gradient,
      interest_threshold,
      status,
      display_order,
      disclaimer_required,
      disclaimer_text,
      special_badge,
    } = body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (room_key !== undefined) updates.room_key = room_key;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (image_url !== undefined) updates.image_url = image_url;
    if (fallback_gradient !== undefined) updates.fallback_gradient = fallback_gradient;
    if (interest_threshold !== undefined) updates.interest_threshold = interest_threshold;
    if (status !== undefined) updates.status = status;
    if (display_order !== undefined) updates.display_order = display_order;
    if (disclaimer_required !== undefined) updates.disclaimer_required = disclaimer_required;
    if (disclaimer_text !== undefined) updates.disclaimer_text = disclaimer_text;
    if (special_badge !== undefined) updates.special_badge = special_badge;

    const { data: room, error } = await supabase
      .from('coming_soon_rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      console.error('[API /admin/rooms/[id]] Update error:', error);
      return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }

    return NextResponse.json({ room });
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
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('coming_soon_rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      console.error('[API /admin/rooms/[id]] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/rooms/[id]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

