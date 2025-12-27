import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, getStripe, logStripeAction } from '@/lib/stripe';
import {
  recordStripeEvent,
  updateConnectAccountStatus,
  getSupabaseAdmin,
} from '@/lib/supabase-admin';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events (LIVE)
 * 
 * Required events:
 * - checkout.session.completed (coin purchases)
 * - account.updated (Connect status)
 * - payout.paid / payout.failed (optional audit)
 * - transfer.created (optional audit)
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Get raw body and signature
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logStripeAction('webhook-missing-signature', { requestId });
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logStripeAction('webhook-missing-secret', { requestId });
      console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify signature
    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(payload, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown';
      logStripeAction('webhook-signature-failed', {
        requestId,
        error: message,
      });
      return NextResponse.json(
        { error: 'Signature verification failed', message },
        { status: 400 }
      );
    }

    logStripeAction('webhook-received', {
      requestId,
      eventId: event.id,
      eventType: event.type,
    });

    // Check if already processed (idempotency)
    const { alreadyProcessed, error: recordError } = await recordStripeEvent({
      eventId: event.id,
      eventType: event.type,
      requestId,
    });

    if (alreadyProcessed) {
      logStripeAction('webhook-duplicate', {
        requestId,
        eventId: event.id,
      });
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (recordError) {
      logStripeAction('webhook-record-error', {
        requestId,
        eventId: event.id,
        error: recordError,
      });
      // Continue processing anyway
    }

    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, requestId);
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, requestId);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent, requestId);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge, requestId);
        break;
      }

      case 'charge.dispute.created':
      case 'charge.dispute.updated': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeUpdated(dispute, requestId);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account, requestId);
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        logStripeAction('payout-paid', {
          requestId,
          payoutId: payout.id,
          amount: payout.amount,
          destination: payout.destination,
        });
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        logStripeAction('payout-failed', {
          requestId,
          payoutId: payout.id,
          failureCode: payout.failure_code,
          failureMessage: payout.failure_message,
        });
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        logStripeAction('transfer-created', {
          requestId,
          transferId: transfer.id,
          amount: transfer.amount,
          destination: transfer.destination,
        });
        break;
      }

      default:
        logStripeAction('webhook-unhandled-type', {
          requestId,
          eventType: event.type,
        });
    }

    try {
      const supabase = getSupabaseAdmin();
      const { error: markErr } = await supabase
        .from('stripe_events')
        .update({ processed: true })
        .eq('event_id', event.id);

      if (markErr) {
        logStripeAction('webhook-mark-processed-failed', {
          requestId,
          eventId: event.id,
          eventType: event.type,
          error: markErr.message,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown';
      logStripeAction('webhook-mark-processed-error', {
        requestId,
        eventId: event.id,
        eventType: event.type,
        error: message,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown';
    logStripeAction('webhook-error', {
      requestId,
      error: message,
    });
    console.error('[WEBHOOK] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', message },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * Credit coins to user wallet using cfm_finalize_coin_purchase
 */
 async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  requestId: string
) {
  const creditStartMs = Date.now();
  // Locked rule: webhook credits COINS only.
  // Must read user_id + coins_awarded from metadata (fallbacks allowed for legacy sessions).
  const userId = session.metadata?.user_id || session.client_reference_id;
  const coinsStr =
    session.metadata?.coins_awarded ||
    session.metadata?.coins_amount ||
    session.metadata?.coins;

  if (!userId) {
    logStripeAction('checkout-missing-metadata', {
      requestId,
      sessionId: session.id,
      userId,
      coins_awarded: coinsStr,
    });
    throw new Error('Missing userId on checkout.session.* purchase event');
  }

  const usdCents = session.amount_total || 0;
  let paymentIntentId: string | null = null;
  if (typeof session.payment_intent === 'string') {
    paymentIntentId = session.payment_intent;
  } else if (
    session.payment_intent &&
    typeof session.payment_intent === 'object' &&
    'id' in session.payment_intent
  ) {
    const raw = (session.payment_intent as any)?.id;
    paymentIntentId = raw ? String(raw) : null;
  }

  // If the session payload didn't include a payment_intent (or it was missing), try to retrieve it.
  // This prevents double-crediting when both checkout.session.* and payment_intent.succeeded fire.
  if (!paymentIntentId) {
    try {
      const stripe = getStripe();
      const refreshed = await stripe.checkout.sessions.retrieve(String(session.id), {
        expand: ['payment_intent'],
      });
      const pi = (refreshed as any)?.payment_intent;
      if (typeof pi === 'string') paymentIntentId = pi;
      else if (pi && typeof pi === 'object' && pi.id) paymentIntentId = String(pi.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown';
      logStripeAction('checkout-session-retrieve-failed', {
        requestId,
        sessionId: session.id,
        error: message,
      });
    }
  }

  if (!paymentIntentId) {
    logStripeAction('checkout-missing-payment-intent', {
      requestId,
      sessionId: session.id,
      userId,
      coins_awarded: coinsStr,
    });
    throw new Error('Missing payment_intent on checkout.session.* purchase event');
  }

  const providerRef = String(paymentIntentId);
  const idempotencyKey = `stripe:pi:${providerRef}`;

  const supabase = getSupabaseAdmin();
  let coins: number | null = null;

  const priceId = session.metadata?.price_id ? String(session.metadata.price_id) : null;
  if (priceId) {
    const { data, error } = await supabase
      .from('coin_packs')
      .select('coins_amount')
      .eq('stripe_price_id', priceId)
      .eq('active', true)
      .maybeSingle();

    if (!error && data?.coins_amount != null) {
      const parsed = Number(data.coins_amount);
      coins = Number.isFinite(parsed) ? parsed : null;
    }
  }

  if (!coins && usdCents > 0) {
    const { data, error } = await supabase
      .from('coin_packs')
      .select('coins_amount')
      .eq('price_cents', usdCents)
      .eq('active', true)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && data?.coins_amount != null) {
      const parsed = Number(data.coins_amount);
      coins = Number.isFinite(parsed) ? parsed : null;
    }
  }

  if (!coins && coinsStr) {
    const parsed = parseInt(String(coinsStr), 10);
    coins = Number.isFinite(parsed) ? parsed : null;
  }

  if (!coins || coins <= 0) {
    logStripeAction('checkout-invalid-coins', {
      requestId,
      sessionId: session.id,
      userId,
      coins_awarded: coinsStr,
      usdCents,
      priceId,
    });
    throw new Error('Invalid coins for checkout.session.* purchase event');
  }

  logStripeAction('checkout-processing', {
    requestId,
    sessionId: session.id,
    userId,
    coins,
    usdCents,
    providerRef,
    idempotencyKey,
  });

  // Pre-flight guard against double-crediting:
  // If we previously finalized with stripe:pi:<paymentIntentId>, skip calling finalize_coin_purchase again.
  try {
    const existing = await supabase
      .from('ledger_entries')
      .select('id')
      .or(
        [
          `idempotency_key.eq.${idempotencyKey}`,
          `provider_ref.eq.${String(paymentIntentId)}`,
        ]
          .filter(Boolean)
          .join(',')
      )
      .limit(1)
      .maybeSingle();

    if (!existing.error && existing.data?.id) {
      logStripeAction('checkout-skip-existing-finalization', {
        requestId,
        sessionId: session.id,
        paymentIntentId,
        providerRef,
        idempotencyKey,
        ledgerId: existing.data.id,
      });
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    logStripeAction('checkout-finalization-guard-error', {
      requestId,
      sessionId: session.id,
      paymentIntentId,
      error: message,
    });
  }

  // Call RPC to finalize purchase (coins only)
  const { data: ledgerId, error } = await supabase.rpc('finalize_coin_purchase', {
    p_idempotency_key: idempotencyKey,
    p_user_id: userId,
    p_coins_amount: coins,
    p_amount_usd_cents: usdCents,
    p_provider_ref: providerRef,
  });

  if (error) {
    logStripeAction('checkout-rpc-error', {
      requestId,
      sessionId: session.id,
      userId,
      error: error.message,
    });
    throw new Error(`finalize_coin_purchase failed (checkout.session.*): ${error.message}`);
  }

  logStripeAction('checkout-finalized', {
    requestId,
    sessionId: session.id,
    userId,
    coinsAwarded: coins,
    ledgerId,
    creditLatencyMs: Date.now() - creditStartMs,
  });

  try {
    if (!session.payment_intent) return;

    const stripe = getStripe();
    const paymentIntentId = String(session.payment_intent);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const latestChargeId =
      typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id;

    if (!latestChargeId) return;

    const charge = await stripe.charges.retrieve(String(latestChargeId), {
      expand: ['balance_transaction'],
    });

    const chargeId = charge?.id ? String(charge.id) : null;

    const expandedBt = charge?.balance_transaction;
    const btId = typeof expandedBt === 'string' ? expandedBt : expandedBt?.id;
    const balanceTxn =
      typeof expandedBt === 'object' && expandedBt
        ? expandedBt
        : btId
          ? await stripe.balanceTransactions.retrieve(String(btId))
          : null;

    const stripeFeeCents = balanceTxn?.fee ?? null;
    const stripeNetCents = balanceTxn?.net ?? null;
    const stripeBalanceTxnId = balanceTxn?.id ? String(balanceTxn.id) : null;

    if (!chargeId && !stripeBalanceTxnId) return;

    const update: Record<string, unknown> = {
      stripe_charge_id: chargeId,
      stripe_balance_txn_id: stripeBalanceTxnId,
      stripe_fee_cents: stripeFeeCents,
      stripe_net_cents: stripeNetCents,
    };

    const { error: updateErr } = await supabase
      .from('coin_purchases')
      .update(update)
      .or(`provider_payment_id.eq.${providerRef},provider_order_id.eq.${providerRef}`);

    if (updateErr) {
      logStripeAction('checkout-fee-update-failed', {
        requestId,
        sessionId: session.id,
        providerRef,
        error: updateErr.message,
      });
    } else {
      logStripeAction('checkout-fee-updated', {
        requestId,
        sessionId: session.id,
        providerRef,
        stripeChargeId: chargeId,
        stripeBalanceTxnId,
        stripeFeeCents,
        stripeNetCents,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    logStripeAction('checkout-fee-update-error', {
      requestId,
      sessionId: session.id,
      providerRef,
      error: message,
    });
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  requestId: string
) {
  const creditStartMs = Date.now();
  const stripe = getStripe();

  const providerRef = String(paymentIntent.id);
  const idempotencyKey = `stripe:pi:${providerRef}`;

  let userId: string | null = paymentIntent.metadata?.user_id ?? null;
  const coinsStr: string | null =
    paymentIntent.metadata?.coins_awarded ??
    paymentIntent.metadata?.coins_amount ??
    paymentIntent.metadata?.coins ??
    null;

  let sessionId: string | null = null;
  let usdCents: number = paymentIntent.amount_received ?? paymentIntent.amount ?? 0;
  let priceId: string | null = paymentIntent.metadata?.price_id ?? null;

  try {
    if ((!userId || !coinsStr) && providerRef) {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: providerRef,
        limit: 1,
      });

      const session = sessions.data?.[0] ?? null;
      if (session) {
        sessionId = session.id;
        userId = userId ?? session.metadata?.user_id ?? session.client_reference_id ?? null;
        priceId = priceId ?? (session.metadata?.price_id ? String(session.metadata.price_id) : null);
        usdCents = session.amount_total ?? usdCents;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    logStripeAction('payment-intent-session-lookup-failed', {
      requestId,
      paymentIntentId: providerRef,
      error: message,
    });
  }

  if (!userId) {
    logStripeAction('payment-intent-missing-metadata', {
      requestId,
      paymentIntentId: providerRef,
      sessionId,
      userId,
      coins_awarded: coinsStr,
    });
    throw new Error('Missing userId on payment_intent.succeeded purchase event');
  }

  // Guard against double-crediting:
  // If checkout.session.* already finalized using stripe:pi:<paymentIntentId>, this call will be idempotent.

  const supabase = getSupabaseAdmin();
  let coins: number | null = null;

  if (priceId) {
    const { data, error } = await supabase
      .from('coin_packs')
      .select('coins_amount')
      .eq('stripe_price_id', String(priceId))
      .eq('active', true)
      .maybeSingle();

    if (!error && data?.coins_amount != null) {
      const parsed = Number(data.coins_amount);
      coins = Number.isFinite(parsed) ? parsed : null;
    }
  }

  if (!coins && usdCents > 0) {
    const { data, error } = await supabase
      .from('coin_packs')
      .select('coins_amount')
      .eq('price_cents', usdCents)
      .eq('active', true)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && data?.coins_amount != null) {
      const parsed = Number(data.coins_amount);
      coins = Number.isFinite(parsed) ? parsed : null;
    }
  }

  if (!coins && coinsStr) {
    const parsed = parseInt(String(coinsStr), 10);
    coins = Number.isFinite(parsed) ? parsed : null;
  }

  if (!coins || coins <= 0) {
    logStripeAction('payment-intent-invalid-coins', {
      requestId,
      paymentIntentId: providerRef,
      sessionId,
      userId,
      coins_awarded: coinsStr,
      usdCents,
      priceId,
    });
    throw new Error('Invalid coins for payment_intent.succeeded purchase event');
  }

  logStripeAction('payment-intent-processing', {
    requestId,
    paymentIntentId: providerRef,
    sessionId,
    userId,
    coins,
    usdCents,
    idempotencyKey,
  });

  const { data: ledgerId, error } = await supabase.rpc('finalize_coin_purchase', {
    p_idempotency_key: idempotencyKey,
    p_user_id: userId,
    p_coins_amount: coins,
    p_amount_usd_cents: usdCents,
    p_provider_ref: providerRef,
  });

  if (error) {
    logStripeAction('payment-intent-rpc-error', {
      requestId,
      paymentIntentId: providerRef,
      sessionId,
      userId,
      error: error.message,
    });
    throw new Error(`finalize_coin_purchase failed (payment_intent.succeeded): ${error.message}`);
  }

  logStripeAction('payment-intent-finalized', {
    requestId,
    paymentIntentId: providerRef,
    sessionId,
    userId,
    coinsAwarded: coins,
    ledgerId,
    creditLatencyMs: Date.now() - creditStartMs,
  });
}

async function handleChargeRefunded(charge: Stripe.Charge, requestId: string) {
  const supabase = getSupabaseAdmin();
  const chargeId = String(charge.id);
  const paymentIntentId = charge.payment_intent ? String(charge.payment_intent) : null;
  const refundedCents = charge.amount_refunded ?? 0;

  const orClauses = [`stripe_charge_id.eq.${chargeId}`];
  if (paymentIntentId) orClauses.push(`provider_payment_id.eq.${paymentIntentId}`);

  const update: Record<string, unknown> = {
    refunded_cents: refundedCents,
    refunded_at: new Date().toISOString(),
  };
  if (refundedCents > 0) update.status = 'refunded';

  const { error } = await supabase.from('coin_purchases').update(update).or(orClauses.join(','));

  if (error) {
    logStripeAction('charge-refunded-update-failed', {
      requestId,
      chargeId,
      paymentIntentId,
      refundedCents,
      error: error.message,
    });
    return;
  }

  logStripeAction('charge-refunded-updated', {
    requestId,
    chargeId,
    paymentIntentId,
    refundedCents,
  });
}

async function handleDisputeUpdated(dispute: Stripe.Dispute, requestId: string) {
  const supabase = getSupabaseAdmin();
  const stripe = getStripe();

  const disputeId = String(dispute.id);
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
  if (!chargeId) {
    logStripeAction('dispute-missing-charge', { requestId, disputeId });
    return;
  }

  let paymentIntentId: string | null = null;
  try {
    const charge = await stripe.charges.retrieve(String(chargeId));
    paymentIntentId = charge.payment_intent ? String(charge.payment_intent) : null;
  } catch {
    paymentIntentId = null;
  }

  const disputedCents = dispute.amount ?? 0;
  const disputeStatus = dispute.status ? String(dispute.status) : null;

  const orClauses = [`stripe_charge_id.eq.${String(chargeId)}`];
  if (paymentIntentId) orClauses.push(`provider_payment_id.eq.${paymentIntentId}`);

  const { error } = await supabase
    .from('coin_purchases')
    .update({
      disputed_cents: disputedCents,
      dispute_id: disputeId,
      dispute_status: disputeStatus,
      status: 'disputed',
    })
    .or(orClauses.join(','));

  if (error) {
    logStripeAction('dispute-update-failed', {
      requestId,
      disputeId,
      chargeId,
      paymentIntentId,
      disputedCents,
      disputeStatus,
      error: error.message,
    });
    return;
  }

  logStripeAction('dispute-updated', {
    requestId,
    disputeId,
    chargeId,
    paymentIntentId,
    disputedCents,
    disputeStatus,
  });
}

/**
 * Handle account.updated
 * Update Connect account status in database
 */
async function handleAccountUpdated(
  account: Stripe.Account,
  requestId: string
) {
  logStripeAction('account-updated', {
    requestId,
    accountId: account.id,
    payoutsEnabled: account.payouts_enabled,
    chargesEnabled: account.charges_enabled,
    detailsSubmitted: account.details_submitted,
    country: account.country,
  });

  let disabledReason: string | undefined;

  if (!account.payouts_enabled && account.requirements) {
    const errors = account.requirements.errors;
    if (errors && errors.length > 0) {
      disabledReason = errors.map(e => e.reason).join('; ');
    } else if (account.requirements.disabled_reason) {
      disabledReason = account.requirements.disabled_reason;
    }
  }

  const result = await updateConnectAccountStatus({
    stripeAccountId: account.id,
    payoutsEnabled: account.payouts_enabled || false,
    chargesEnabled: account.charges_enabled || false,
    detailsSubmitted: account.details_submitted || false,
    country: account.country,
    disabledReason,
  });

  if (!result.success) {
    logStripeAction('account-update-failed', {
      requestId,
      accountId: account.id,
      error: result.error,
    });
  }
}

