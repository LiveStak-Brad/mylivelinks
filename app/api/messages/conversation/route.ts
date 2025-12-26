import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const otherProfileId = typeof body?.otherProfileId === 'string' ? body.otherProfileId : null;
    if (!otherProfileId) {
      return NextResponse.json({ error: 'otherProfileId is required' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
      p_other_profile_id: otherProfileId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ conversationId: data }, { status: 200 });
  } catch (err) {
    console.error('POST /api/messages/conversation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
