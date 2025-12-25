import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, logStripeAction } from '@/lib/stripe';
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
  // Locked rule: webhook credits COINS only.
  // Must read user_id + coins_awarded from metadata (fallbacks allowed for legacy sessions).
  const userId = session.metadata?.user_id || session.client_reference_id;
  const coinsStr =
    session.metadata?.coins_awarded ||
    session.metadata?.coins_amount ||
    session.metadata?.coins;

  if (!userId || !coinsStr) {
    logStripeAction('checkout-missing-metadata', {
      requestId,
      sessionId: session.id,
      userId,
      coins_awarded: coinsStr,
    });
    return;
  }

  const coins = parseInt(coinsStr, 10);
  if (!Number.isFinite(coins) || coins <= 0) {
    logStripeAction('checkout-invalid-coins', {
      requestId,
      sessionId: session.id,
      userId,
      coins_awarded: coinsStr,
    });
    return;
  }

  const usdCents = session.amount_total || 0;
  const providerRef = session.payment_intent ?? session.id;
  const idempotencyKey = `stripe:${providerRef}`;

  logStripeAction('checkout-processing', {
    requestId,
    sessionId: session.id,
    userId,
    coins,
    usdCents,
    providerRef,
    idempotencyKey,
  });

  // Call RPC to finalize purchase (coins only)
  const supabase = getSupabaseAdmin();
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
    return;
  }

  logStripeAction('checkout-finalized', {
    requestId,
    sessionId: session.id,
    userId,
    coinsAwarded: coins,
    ledgerId,
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

