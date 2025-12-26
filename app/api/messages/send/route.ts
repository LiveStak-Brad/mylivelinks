import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

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

    const type = isString(body?.type) ? body.type : 'text';
    if (!['text', 'image', 'video'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const otherProfileId = isString(body?.otherProfileId) ? body.otherProfileId : null;
    let conversationId = isString(body?.conversationId) ? body.conversationId : null;

    if (!conversationId) {
      if (!otherProfileId) {
        return NextResponse.json({ error: 'conversationId or otherProfileId is required' }, { status: 400 });
      }

      const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
        p_other_profile_id: otherProfileId,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      conversationId = data;
    }

    const requestId = isString(body?.requestId) && body.requestId.length > 0 ? body.requestId : crypto.randomUUID();

    const insertPayload: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      type,
      request_id: requestId,
    };

    if (type === 'text') {
      const text = isString(body?.text) ? body.text : '';
      if (!text || text.length > 2000) {
        return NextResponse.json({ error: 'text is required (max 2000 chars)' }, { status: 400 });
      }
      insertPayload.body_text = text;
    } else {
      const mediaUrl = isString(body?.mediaUrl) ? body.mediaUrl : null;
      const mediaMime = isString(body?.mediaMime) ? body.mediaMime : null;
      if (!mediaUrl || !mediaMime) {
        return NextResponse.json({ error: 'mediaUrl and mediaMime are required' }, { status: 400 });
      }
      insertPayload.media_url = mediaUrl;
      insertPayload.media_mime = mediaMime;

      if (Number.isFinite(Number(body?.mediaWidth))) insertPayload.media_width = Number(body.mediaWidth);
      if (Number.isFinite(Number(body?.mediaHeight))) insertPayload.media_height = Number(body.mediaHeight);
      if (Number.isFinite(Number(body?.mediaDurationMs))) insertPayload.media_duration_ms = Number(body.mediaDurationMs);
    }

    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select('*');

    if (insertError) {
      if ((insertError as any).code === '23505') {
        const { data: existing, error: selectError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('request_id', requestId)
          .limit(1);

        if (selectError) {
          return NextResponse.json({ error: selectError.message }, { status: 500 });
        }

        return NextResponse.json({ message: (existing ?? [])[0] ?? null, alreadyExisted: true }, { status: 200 });
      }

      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ message: (inserted ?? [])[0] ?? null }, { status: 200 });
  } catch (err) {
    console.error('POST /api/messages/send error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
