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
        await handleCheckoutCompleted(session, event.id, requestId);
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, event.id, requestId);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent, event.id, requestId);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge, event.id, requestId);
        break;
      }

      case 'charge.dispute.created':
      case 'charge.dispute.updated': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeUpdated(dispute, event.id, requestId);
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
  eventId: string,
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
  const supabase = getSupabaseAdmin();
  const priceId = session.metadata?.price_id ? String(session.metadata.price_id) : null;
  const packSku = session.metadata?.pack_sku ? String(session.metadata.pack_sku) : null;

  logStripeAction('checkout-processing', {
    requestId,
    sessionId: session.id,
    userId,
    usdCents,
    providerRef,
  });

  const { data: finalizeResult, error: finalizeError } = await supabase.rpc('finalize_coin_purchase_v2', {
    p_payment_intent_id: paymentIntentId,
    p_profile_id: userId,
    p_stripe_price_id: priceId,
    p_platform: session.metadata?.platform || 'web',
    p_metadata: {
      stripe_event_id: eventId,
      checkout_session_id: session.id,
      payment_intent_id: paymentIntentId,
      stripe_price_id: priceId,
      pack_sku: packSku,
    },
  });

  if (finalizeError) {
    logStripeAction('checkout-rpc-error', {
      requestId,
      sessionId: session.id,
      userId,
      error: finalizeError.message,
    });
    throw new Error(`finalize_coin_purchase_v2 failed (checkout.session.*): ${finalizeError.message}`);
  }

  logStripeAction('checkout-finalized', {
    requestId,
    sessionId: session.id,
    userId,
    purchaseId: finalizeResult?.purchase_id,
    ledgerId: finalizeResult?.ledger_entry_id,
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
  eventId: string,
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

  const supabase = getSupabaseAdmin();
  const packSku = paymentIntent.metadata?.pack_sku ?? null;

  logStripeAction('payment-intent-processing', {
    requestId,
    paymentIntentId: providerRef,
    sessionId,
    userId,
    usdCents,
  });

  const { data: finalizeResult, error: finalizeError } = await supabase.rpc('finalize_coin_purchase_v2', {
    p_payment_intent_id: providerRef,
    p_profile_id: userId,
    p_stripe_price_id: priceId,
    p_platform: paymentIntent.metadata?.platform || 'web',
    p_metadata: {
      stripe_event_id: eventId,
      stripe_price_id: priceId,
      pack_sku: packSku,
      checkout_session_id: sessionId,
      payment_intent_id: providerRef,
    },
  });

  if (finalizeError) {
    logStripeAction('payment-intent-rpc-error', {
      requestId,
      paymentIntentId: providerRef,
      sessionId,
      userId,
      error: finalizeError.message,
    });
    throw new Error(`finalize_coin_purchase_v2 failed (payment_intent.succeeded): ${finalizeError.message}`);
  }

  logStripeAction('payment-intent-finalized', {
    requestId,
    paymentIntentId: providerRef,
    sessionId,
    userId,
    purchaseId: finalizeResult?.purchase_id,
    ledgerId: finalizeResult?.ledger_entry_id,
    creditLatencyMs: Date.now() - creditStartMs,
  });
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
  eventId: string,
  requestId: string
) {
  const supabase = getSupabaseAdmin();
  const chargeId = String(charge.id);
  let paymentIntentId = charge.payment_intent ? String(charge.payment_intent) : null;
  const refunds = Array.isArray(charge.refunds?.data) ? charge.refunds.data : [];

  if (!paymentIntentId) {
    try {
      const stripe = getStripe();
      const refreshedCharge = await stripe.charges.retrieve(chargeId);
      if (refreshedCharge.payment_intent) {
        paymentIntentId = String(refreshedCharge.payment_intent);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown';
      logStripeAction('charge-refunded-charge-lookup-failed', {
        requestId,
        chargeId,
        error: message,
      });
    }
  }

  if (!paymentIntentId) {
    logStripeAction('charge-refunded-missing-payment-intent', {
      requestId,
      chargeId,
      refundCount: refunds.length,
    });
    throw new Error('Missing payment_intent on charge.refunded event');
  }

  if (refunds.length === 0) {
    logStripeAction('charge-refunded-no-refund-objects', {
      requestId,
      chargeId,
      paymentIntentId,
    });
    throw new Error('No refund objects on charge.refunded event');
  }

  let processedAny = false;

  for (const refund of refunds) {
    const refundId = refund.id ? String(refund.id) : null;
    const refundAmount = refund.amount ?? null;

    if (!refundId || refundAmount == null) {
      logStripeAction('charge-refunded-missing-amount', {
        requestId,
        chargeId,
        paymentIntentId,
        refundId,
        refundAmount,
      });
      throw new Error('Refund object missing id or amount');
    }

    const { error: refundError } = await supabase.rpc('process_coin_refund', {
      p_payment_intent_id: paymentIntentId,
      p_refund_event_id: refundId,
      p_refund_cents: refundAmount,
      p_reason: 'refund',
      p_metadata: {
        stripe_event_id: eventId,
        stripe_charge_id: chargeId,
        stripe_refund_id: refundId,
        refund_status: refund.status ?? null,
      },
    });

    if (refundError) {
      logStripeAction('charge-refund-rpc-error', {
        requestId,
        chargeId,
        paymentIntentId,
        refundId,
        refundAmount,
        error: refundError.message,
      });
      throw new Error(`process_coin_refund failed for refund ${refundId}: ${refundError.message}`);
    }

    logStripeAction('charge-refund-processed', {
      requestId,
      chargeId,
      paymentIntentId,
      refundId,
      refundAmount,
    });

    processedAny = true;
  }

  if (processedAny) {
    await enforceMonetizationHold({
      paymentIntentId,
      requestId,
      eventId,
      chargeId,
      trigger: 'refund',
    });
  }
}

async function handleDisputeUpdated(
  dispute: Stripe.Dispute,
  eventId: string,
  requestId: string
) {
  const supabase = getSupabaseAdmin();
  const stripe = getStripe();

  const disputeId = String(dispute.id);
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
  if (!chargeId) {
    logStripeAction('dispute-missing-charge', { requestId, disputeId });
    return;
  }

  let paymentIntentId: string | null = null;
  let chargeAmount: number | null = null;
  try {
    const charge = await stripe.charges.retrieve(String(chargeId));
    paymentIntentId = charge.payment_intent ? String(charge.payment_intent) : null;
    chargeAmount = typeof charge.amount === 'number' ? charge.amount : null;
  } catch {
    paymentIntentId = null;
  }

  if (!paymentIntentId) {
    logStripeAction('dispute-missing-payment-intent', {
      requestId,
      disputeId,
      chargeId,
    });
    throw new Error('Missing payment_intent on dispute event');
  }

  let disputeAmount = typeof dispute.amount === 'number' ? dispute.amount : null;

  if (!disputeAmount && chargeAmount) {
    disputeAmount = chargeAmount;
  }

  if (!disputeAmount) {
    logStripeAction('dispute-missing-amount', {
      requestId,
      disputeId,
      chargeId,
      paymentIntentId,
      chargeAmount,
    });
    throw new Error('Dispute missing amount');
  }

  const { data: refundResult, error: refundError } = await supabase.rpc('process_coin_refund', {
    p_payment_intent_id: paymentIntentId,
    p_refund_event_id: disputeId,
    p_refund_cents: disputeAmount,
    p_reason: 'dispute',
    p_metadata: {
      stripe_event_id: eventId,
      stripe_dispute_id: disputeId,
      stripe_charge_id: chargeId,
      dispute_status: dispute.status,
      dispute_reason: dispute.reason,
    },
  });

  if (refundError) {
    logStripeAction('dispute-rpc-error', {
      requestId,
      disputeId,
      chargeId,
      paymentIntentId,
      amount_cents: disputeAmount,
      error: refundError.message,
    });
    throw new Error(`process_coin_refund failed for dispute ${disputeId}: ${refundError.message}`);
  }

  await enforceMonetizationHold({
    paymentIntentId,
    requestId,
    eventId,
    chargeId,
    trigger: 'dispute',
  });

  logStripeAction('dispute-processed', {
    requestId,
    disputeId,
    chargeId,
    paymentIntentId,
    amount_cents: disputeAmount,
    result: refundResult,
  });
}

type MonetizationHoldTrigger = 'refund' | 'dispute';

async function enforceMonetizationHold(params: {
  paymentIntentId: string;
  requestId: string;
  eventId: string;
  chargeId?: string | null;
  trigger: MonetizationHoldTrigger;
}) {
  const { paymentIntentId, requestId, eventId, chargeId, trigger } = params;
  const supabase = getSupabaseAdmin();
  const { data: purchaseRow, error: purchaseError } = await supabase
    .from('coin_purchases')
    .select('profile_id')
    .eq('provider_payment_id', paymentIntentId)
    .maybeSingle();

  if (purchaseError) {
    logStripeAction('monetization-enforce-lookup-error', {
      requestId,
      eventId,
      paymentIntentId,
      chargeId,
      trigger,
      error: purchaseError.message,
    });
    return;
  }

  const profileId = purchaseRow?.profile_id ? String(purchaseRow.profile_id) : null;

  if (!profileId) {
    logStripeAction('monetization-enforce-missing-profile', {
      requestId,
      chargeId,
      paymentIntentId,
      eventId,
      trigger,
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const { data: updatedRows, error: updateError } = await supabase
    .from('user_sanctions')
    .update({ monetization_disabled: true, updated_at: timestamp })
    .eq('target_profile_id', profileId)
    .select('target_profile_id');

  if (updateError) {
    logStripeAction('monetization-enforce-update-error', {
      requestId,
      eventId,
      paymentIntentId,
      chargeId,
      trigger,
      profileId,
      error: updateError.message,
    });
    return;
  }

  if (!updatedRows || updatedRows.length === 0) {
    const { error: insertError } = await supabase.from('user_sanctions').insert({
      target_profile_id: profileId,
      monetization_disabled: true,
    });

    if (insertError) {
      logStripeAction('monetization-enforce-insert-error', {
        requestId,
        eventId,
        paymentIntentId,
        chargeId,
        trigger,
        profileId,
        error: insertError.message,
      });
      return;
    }
  }

  logStripeAction('monetization-enforce-applied', {
    requestId,
    eventId,
    paymentIntentId,
    chargeId,
    trigger,
    profileId,
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

