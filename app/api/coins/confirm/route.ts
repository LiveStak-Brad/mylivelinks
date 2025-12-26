import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripe, logStripeAction } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body?.sessionId;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paymentStatus = session.payment_status;
    const status = session.status;

    if (paymentStatus !== 'paid' && status !== 'complete') {
      logStripeAction('confirm-not-paid', {
        requestId,
        sessionId,
        paymentStatus,
        status,
      });
      return NextResponse.json(
        { error: 'Checkout session not paid', paymentStatus, status },
        { status: 409 }
      );
    }

    const sessionUserId = session.metadata?.user_id || session.client_reference_id;
    if (!sessionUserId || sessionUserId !== user.id) {
      logStripeAction('confirm-user-mismatch', {
        requestId,
        sessionId,
        sessionUserId,
        userId: user.id,
      });
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    const coinsStr =
      session.metadata?.coins_awarded ||
      session.metadata?.coins_amount ||
      session.metadata?.coins;

    const coins = parseInt(String(coinsStr ?? ''), 10);
    if (!Number.isFinite(coins) || coins <= 0) {
      logStripeAction('confirm-invalid-coins', {
        requestId,
        sessionId,
        coinsStr,
      });
      return NextResponse.json({ error: 'Invalid coins amount' }, { status: 400 });
    }

    const usdCents = session.amount_total || 0;
    const providerRef = (session.payment_intent as string | null) ?? session.id;
    const idempotencyKey = `stripe:${providerRef}`;

    const adminSupabase = getSupabaseAdmin();
    const { data: ledgerId, error: rpcError } = await adminSupabase.rpc(
      'finalize_coin_purchase',
      {
        p_idempotency_key: idempotencyKey,
        p_user_id: user.id,
        p_coins_amount: coins,
        p_amount_usd_cents: usdCents,
        p_provider_ref: providerRef,
      }
    );

    if (rpcError) {
      logStripeAction('confirm-rpc-error', {
        requestId,
        sessionId,
        userId: user.id,
        error: rpcError.message,
      });
      return NextResponse.json(
        { error: 'Failed to finalize purchase', message: rpcError.message },
        { status: 500 }
      );
    }

    logStripeAction('confirm-finalized', {
      requestId,
      sessionId,
      userId: user.id,
      coins,
      usdCents,
      providerRef,
      ledgerId,
    });

    return NextResponse.json({ ok: true, ledgerId, coins, usdCents });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStripeAction('confirm-error', { requestId, error: message });
    return NextResponse.json({ error: 'Confirm failed', message }, { status: 500 });
  }
}
