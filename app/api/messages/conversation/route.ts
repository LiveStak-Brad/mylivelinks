import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { isBlockedBidirectional } from '@/lib/blocks';

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

    if (await isBlockedBidirectional(supabase as any, user.id, otherProfileId)) {
      return NextResponse.json({ error: 'Messaging unavailable.' }, { status: 403 });
    }

    const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
      p_other_profile_id: otherProfileId,
    });

    if (error) {
      if ((error as any)?.message === 'blocked') {
        return NextResponse.json({ error: 'Messaging unavailable.' }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ conversationId: data }, { status: 200 });
  } catch (err) {
    console.error('POST /api/messages/conversation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
