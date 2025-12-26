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

// GET /api/admin/rooms - List all rooms (including drafts) for admin
export async function GET() {
  try {
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: rooms, error } = await supabase
      .from('coming_soon_rooms')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[API /admin/rooms] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }

    return NextResponse.json({ rooms: rooms || [] });
  } catch (err) {
    console.error('[API /admin/rooms] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
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

    if (!room_key || !name || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: room, error } = await supabase
      .from('coming_soon_rooms')
      .insert({
        room_key,
        name,
        description: description || null,
        category,
        image_url: image_url || null,
        fallback_gradient: fallback_gradient || 'from-purple-600 to-pink-600',
        interest_threshold: interest_threshold || 5000,
        status: status || 'interest',
        display_order: display_order || 0,
        disclaimer_required: disclaimer_required || false,
        disclaimer_text: disclaimer_text || null,
        special_badge: special_badge || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[API /admin/rooms] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    return NextResponse.json({ room });
  } catch (err) {
    console.error('[API /admin/rooms] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

