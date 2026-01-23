import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isBlockedBidirectional } from '@/lib/blocks';

/**
 * POST /api/gifts/send
 * Send a gift from authenticated user to recipient
 * 
 * Body: { toUserId: string, coinsAmount: number, streamId?: number }
 * Returns: { success: boolean, giftId: number, diamondsAwarded: number }
 * 
 * IMPORTANT: Gifts award diamonds 1:1 with coins spent (no platform fee on gifts)
 */
export async function POST(request: NextRequest) {
  let requestId = crypto.randomUUID();

  try {
    // Parse request
    const body = await request.json();
    const { toUserId, coinsAmount, streamId, giftTypeId, roomSlug, roomId } = body;
    const resolvedRoomSlug =
      typeof roomSlug === 'string' && roomSlug.length > 0
        ? roomSlug
        : (typeof roomId === 'string' && roomId.length > 0 ? roomId : null);

    const clientRequestId =
      typeof body?.requestId === 'string'
        ? body.requestId
        : (typeof body?.request_id === 'string' ? body.request_id : null);
    if (clientRequestId && clientRequestId.length > 0) {
      requestId = clientRequestId;
    }

    // Validate input
    if (!toUserId || typeof toUserId !== 'string') {
      return NextResponse.json(
        { error: 'toUserId is required' },
        { status: 400 }
      );
    }

    if (!coinsAmount || typeof coinsAmount !== 'number' || coinsAmount <= 0) {
      return NextResponse.json(
        { error: 'coinsAmount must be a positive number' },
        { status: 400 }
      );
    }

    const supabase = createAuthedRouteHandlerClient(request);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[GIFT] Unauthorized gift attempt', { requestId });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prevent self-gifting
    if (user.id === toUserId) {
      return NextResponse.json(
        { error: 'Cannot send gift to yourself' },
        { status: 400 }
      );
    }

    if (await isBlockedBidirectional(supabase as any, user.id, toUserId)) {
      return NextResponse.json({ error: 'Gifting unavailable.' }, { status: 403 });
    }

    // Use admin client for RPC call
    const adminSupabase = getSupabaseAdmin();

    console.log('[GIFT] Processing gift', {
      requestId,
      senderId: user.id,
      recipientId: toUserId,
      coinsAmount,
      streamId,
    });

    // Resolve stream ID (WEB Solo Live): required for stream-scoped chat + top gifters.
    // If client doesn't send it, derive from recipient's most recent active solo stream.
    const resolvedStreamId = (() => {
      const n = typeof streamId === 'number' ? streamId : Number(streamId);
      return Number.isFinite(n) && n > 0 ? n : null;
    })();

    let finalStreamId: number | null = resolvedStreamId;
    if (!finalStreamId) {
      const { data: liveRow } = await adminSupabase
        .from('live_streams')
        .select('id')
        .eq('profile_id', toUserId)
        .eq('live_available', true)
        .eq('streaming_mode', 'solo')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const id = (liveRow as any)?.id;
      if (typeof id === 'number' && id > 0) finalStreamId = id;
    }

    // Call RPC function (gifts are 1:1 coins->diamonds)
    const { data, error: rpcError } = await adminSupabase.rpc('send_gift_v2', {
      p_sender_id: user.id,
      p_recipient_id: toUserId,
      p_coins_amount: coinsAmount,
      p_gift_type_id: giftTypeId || null,
      p_stream_id: finalStreamId,
      p_request_id: requestId,
      p_room_id: resolvedRoomSlug, // For room-specific leaderboards
    });

    if (rpcError) {
      const msg = (rpcError as any)?.message;
      if (msg === 'Gifting unavailable.' || msg === 'blocked') {
        return NextResponse.json({ error: 'Gifting unavailable.' }, { status: 403 });
      }
      console.error('[GIFT] RPC error', {
        requestId,
        error: rpcError.message,
      });
      return NextResponse.json(
        { error: rpcError.message },
        { status: 400 }
      );
    }

    console.log('[GIFT] Gift sent successfully', {
      requestId,
      result: data,
    });

    // Insert a stream-scoped chat announcement (service role; bypasses RLS).
    // StreamChat filters on: live_stream_id=<id> AND room_id IS NULL
    let chatInserted = false;
    if (finalStreamId) {
      try {
        const [{ data: senderP }, { data: recipientP }, { data: giftTypeP }] = await Promise.all([
          adminSupabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
          adminSupabase.from('profiles').select('username').eq('id', toUserId).maybeSingle(),
          giftTypeId
            ? adminSupabase.from('gift_types').select('name').eq('id', giftTypeId).maybeSingle()
            : Promise.resolve({ data: null } as any),
        ]);

        const senderUsername = (senderP as any)?.username || 'Someone';
        const recipientUsername = (recipientP as any)?.username || 'someone';
        const giftName = (giftTypeP as any)?.name || 'a gift';
        const diamondsAwarded =
          typeof (data as any)?.diamonds_awarded === 'number'
            ? (data as any).diamonds_awarded
            : (typeof (data as any)?.diamondsAwarded === 'number' ? (data as any).diamondsAwarded : null);
        const diamondsSuffix = typeof diamondsAwarded === 'number' ? ` 💎+${diamondsAwarded}` : '';

        const { error: chatErr } = await adminSupabase.from('chat_messages').insert({
          profile_id: user.id,
          content: `${senderUsername} sent "${giftName}" to ${recipientUsername}${diamondsSuffix}`,
          message_type: 'gift',
          live_stream_id: finalStreamId,
          room_id: null,
        });
        if (!chatErr) chatInserted = true;
      } catch (e) {
        console.warn('[GIFT] Failed to insert gift chat announcement', { requestId, err: String(e) });
      }
    }

    // Check if recipient is in an active battle and award battle points
    // Include battle_ready and battle_active statuses (gifts should count during ready phase too)
    // Use RPC function to properly handle both old (host_a/host_b) and new (participants array) formats
    let battlePointsAwarded = null;
    try {
      const { data: activeSession } = await adminSupabase.rpc('rpc_get_active_session_for_host', {
        p_host_id: toUserId,
      });
      
      // Filter to only battle sessions in active/battle_active/battle_ready status
      const battleSession = activeSession && 
        activeSession.type === 'battle' && 
        (activeSession.status === 'active' || 
         activeSession.status === 'battle_active' || 
         activeSession.status === 'battle_ready')
        ? activeSession
        : null;

      if (battleSession) {
        // Get sender profile data for battle supporter tracking
        const { data: senderProfile } = await adminSupabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', user.id)
          .single();

        // Award battle points directly using admin client
        // First, get the participant's team from live_session_participants
        const { data: participant, error: participantError } = await adminSupabase
          .from('live_session_participants')
          .select('team')
          .eq('session_id', battleSession.session_id || battleSession.id)
          .eq('profile_id', toUserId)
          .is('left_at', null)
          .single();
        
        if (!participantError && participant) {
          const teamSide = participant.team; // Can be 'A', 'B', 'C', 'D', etc.
          
          // Award battle points via RPC
          const { data: scoreData, error: scoreError } = await adminSupabase.rpc(
            'rpc_battle_score_apply',
            {
              p_session_id: battleSession.session_id || battleSession.id,
              p_side: teamSide,
              p_points_delta: coinsAmount,
              p_supporter: {
                profile_id: user.id,
                username: senderProfile?.username || 'Unknown',
                display_name: senderProfile?.display_name,
                avatar_url: senderProfile?.avatar_url,
                side: teamSide,
                points_delta: coinsAmount,
                chat_award: false,
              },
            }
          );

          if (!scoreError) {
            battlePointsAwarded = {
              side: teamSide,
              points: coinsAmount,
              boost_applied: false,
              boost_multiplier: 1,
            };
            console.log('[GIFT] Battle points awarded:', {
              requestId,
              teamSide,
              points: coinsAmount,
              recipient: toUserId,
            });
          } else {
            console.error('[GIFT] Battle score RPC error:', { requestId, error: scoreError });
          }
        } else {
          console.warn('[GIFT] Recipient not found in battle participants:', {
            requestId,
            recipientId: toUserId,
            sessionId: battleSession.session_id || battleSession.id,
            error: participantError,
          });
        }
      }
    } catch (battleErr) {
      console.warn('[GIFT] Battle scoring failed (non-fatal)', { requestId, err: String(battleErr) });
    }

    // Get updated sender balance
    const { data: senderProfile } = await adminSupabase
      .from('profiles')
      .select('coin_balance, earnings_balance')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      giftId: data.gift_id,
      coinsSpent: data.coins_spent,
      diamondsAwarded: data.diamonds_awarded,
      platformFee: data.platform_fee,
      chatInserted,
      streamId: finalStreamId,
      battlePoints: battlePointsAwarded,
      senderBalance: {
        coins: senderProfile?.coin_balance || 0,
        diamonds: senderProfile?.earnings_balance || 0,
      },
    });
  } catch (error) {
    console.error('[GIFT] Unhandled error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return NextResponse.json(
      { error: 'Failed to send gift' },
      { status: 500 }
    );
  }
}









