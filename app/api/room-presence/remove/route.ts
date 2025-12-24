import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { profile_id } = body;

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 });
    }

    // Attempt to delete the presence record
    const { error } = await supabase
      .from('room_presence')
      .delete()
      .eq('profile_id', profile_id);

    if (error) {
      console.error('Error deleting room presence via beacon:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Room presence removed' });
  } catch (error: any) {
    console.error('Error in room-presence/remove API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}



