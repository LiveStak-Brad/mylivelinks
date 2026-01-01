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
    const { toUserId, coinsAmount, streamId, giftTypeId } = body;

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

    // Call RPC function (gifts are 1:1 coins->diamonds)
    const { data, error: rpcError } = await adminSupabase.rpc('send_gift_v2', {
      p_sender_id: user.id,
      p_recipient_id: toUserId,
      p_coins_amount: coinsAmount,
      p_gift_type_id: giftTypeId || null,
      p_stream_id: streamId || null,
      p_request_id: requestId,
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









