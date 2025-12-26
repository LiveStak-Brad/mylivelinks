import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    const { data, error } = await supabase
      .from('rooms')
      .select(
        'id, room_key, name, category, status, description, image_url, current_interest_count, interest_threshold, disclaimer_required'
      )
      .order('current_interest_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ROOMS] list error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rooms: data ?? [] }, { status: 200 });
  } catch (error: any) {
    console.error('[ROOMS] list exception:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
