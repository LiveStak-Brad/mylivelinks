import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

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

    let otherProfileId = typeof body?.otherProfileId === 'string' ? body.otherProfileId : null;
    let conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null;

    const coinsAmount = typeof body?.coinsAmount === 'number' ? body.coinsAmount : null;
    const giftTypeId = typeof body?.giftTypeId === 'number' ? body.giftTypeId : null;
    const streamId = typeof body?.streamId === 'number' ? body.streamId : null;
    const messageRequestId = typeof body?.requestId === 'string' && body.requestId.length > 0 ? body.requestId : requestId;

    if (!otherProfileId && !conversationId) {
      return NextResponse.json({ error: 'conversationId or otherProfileId is required' }, { status: 400 });
    }

    if (!coinsAmount || coinsAmount <= 0) {
      return NextResponse.json({ error: 'coinsAmount must be a positive number' }, { status: 400 });
    }

    if (otherProfileId && otherProfileId === user.id) {
      return NextResponse.json({ error: 'Cannot send gift to yourself' }, { status: 400 });
    }

    if (!conversationId) {
      const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
        p_other_profile_id: otherProfileId,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      conversationId = data;
    }

    if (!otherProfileId) {
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('profile_id')
        .eq('conversation_id', conversationId)
        .neq('profile_id', user.id)
        .limit(1);

      if (participantsError) {
        return NextResponse.json({ error: participantsError.message }, { status: 500 });
      }

      otherProfileId = (participants ?? [])[0]?.profile_id ?? null;
      if (!otherProfileId) {
        return NextResponse.json({ error: 'Unable to resolve recipient for conversation' }, { status: 400 });
      }
    }

    if (otherProfileId === user.id) {
      return NextResponse.json({ error: 'Cannot send gift to yourself' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    const { data: giftResult, error: giftError } = await adminSupabase.rpc('send_gift_v2', {
      p_sender_id: user.id,
      p_recipient_id: otherProfileId,
      p_coins_amount: coinsAmount,
      p_gift_type_id: giftTypeId,
      p_stream_id: streamId,
      p_request_id: messageRequestId,
    });

    if (giftError) {
      return NextResponse.json({ error: giftError.message }, { status: 400 });
    }

    let giftName: string | null = null;
    if (giftTypeId) {
      const { data: giftType } = await adminSupabase
        .from('gift_types')
        .select('name')
        .eq('id', giftTypeId)
        .single();
      giftName = (giftType as any)?.name ?? null;
    }

    const insertPayload: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'gift',
      gift_id: giftResult?.gift_id ?? null,
      gift_name: giftName,
      gift_coins: typeof giftResult?.coins_spent === 'number' ? giftResult.coins_spent : coinsAmount,
      gift_tx_id: messageRequestId,
      request_id: messageRequestId,
    };

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
          .eq('request_id', messageRequestId)
          .limit(1);

        if (selectError) {
          return NextResponse.json({ error: selectError.message }, { status: 500 });
        }

        return NextResponse.json(
          {
            message: (existing ?? [])[0] ?? null,
            alreadyExisted: true,
            gift: giftResult,
            conversationId,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: (inserted ?? [])[0] ?? null,
        gift: giftResult,
        conversationId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('POST /api/messages/send-gift error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
