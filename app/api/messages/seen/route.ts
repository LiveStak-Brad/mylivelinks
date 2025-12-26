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

    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null;
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const messageIds = Array.isArray(body?.messageIds)
      ? body.messageIds.filter((id: any) => typeof id === 'string' && id.length > 0)
      : null;

    const upToCreatedAt = typeof body?.upToCreatedAt === 'string' ? body.upToCreatedAt : null;

    if ((!messageIds || messageIds.length === 0) && !upToCreatedAt) {
      return NextResponse.json({ error: 'messageIds or upToCreatedAt is required' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('mark_dm_seen', {
      p_conversation_id: conversationId,
      p_message_ids: messageIds && messageIds.length ? messageIds : null,
      p_up_to_created_at: messageIds && messageIds.length ? null : upToCreatedAt,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ updated: data ?? 0 }, { status: 200 });
  } catch (err) {
    console.error('POST /api/messages/seen error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
