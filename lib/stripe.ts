import Stripe from 'stripe';

/**
 * Stripe client for server-side usage only
 * NEVER import this in client components
 */

// Validate that we have the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && typeof window === 'undefined') {
  console.warn('[STRIPE] STRIPE_SECRET_KEY not set. Stripe functionality will not work.');
}

// Create Stripe client (only if key exists)
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

/**
 * Get Stripe client with runtime check
 * Throws if Stripe is not configured
 */
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Check STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripeClient = getStripe();
  return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Create Stripe Checkout Session for coin purchase
 */
export async function createCoinCheckoutSession(params: {
  userId: string;
  packSku: string;
  packName: string;
  priceId?: string;
  priceCents: number;
  coinsAmount: number;
  vipTier?: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const stripeClient = getStripe();

  // Create idempotency key based on user, pack, and 5-minute bucket
  const timestampBucket = Math.floor(Date.now() / (5 * 60 * 1000));
  const idempotencyKey = `checkout:${params.userId}:${params.packSku}:${timestampBucket}`;

  const metadata: Record<string, string> = {
    user_id: params.userId,
    pack_sku: params.packSku,
    // Locked rule: webhook must read coins_awarded from metadata
    coins_awarded: String(params.coinsAmount),
    // Back-compat with older handlers
    coins_amount: String(params.coinsAmount),
    pack_name: params.packName,
    ...(params.priceId ? { price_id: params.priceId } : {}),
    ...(params.vipTier ? { vip_tier: String(params.vipTier) } : {}),
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    client_reference_id: params.userId,
    metadata,
    payment_intent_data: {
      metadata,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    line_items: params.priceId
      ? [{ price: params.priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'usd',
            unit_amount: params.priceCents,
            product_data: {
              name: params.packName,
              description: 'MyLiveLinks virtual currency',
            },
          },
          quantity: 1,
        }],
  };

  return stripeClient.checkout.sessions.create(sessionParams, {
    idempotencyKey,
  });
}

/**
 * Create Stripe Connect Express account
 */
export async function createConnectAccount(params: {
  userId: string;
  email?: string;
  country?: string;
}): Promise<Stripe.Account> {
  const stripeClient = getStripe();
  
  return stripeClient.accounts.create({
    type: 'express',
    email: params.email,
    country: params.country || 'US',
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      user_id: params.userId,
    },
  });
}

/**
 * Create account onboarding link
 */
export async function createAccountLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<Stripe.AccountLink> {
  const stripeClient = getStripe();
  
  return stripeClient.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
  });
}

/**
 * Retrieve Connect account details
 */
export async function retrieveAccount(accountId: string): Promise<Stripe.Account> {
  const stripeClient = getStripe();
  return stripeClient.accounts.retrieve(accountId);
}

/**
 * Create Transfer to connected account
 */
export async function createTransfer(params: {
  amountCents: number;
  destinationAccountId: string;
  cashoutId: number;
  userId: string;
  diamondsDebited: number;
}): Promise<Stripe.Transfer> {
  const stripeClient = getStripe();
  
  // Idempotency key based on cashout ID
  const idempotencyKey = `transfer:cashout:${params.cashoutId}`;
  
  return stripeClient.transfers.create({
    amount: params.amountCents,
    currency: 'usd',
    destination: params.destinationAccountId,
    metadata: {
      cashout_id: String(params.cashoutId),
      user_id: params.userId,
      diamonds_debited: String(params.diamondsDebited),
    },
  }, {
    idempotencyKey,
  });
}

/**
 * Log helper for structured logging
 */
export function logStripeAction(action: string, data: Record<string, unknown>) {
  const logData = {
    timestamp: new Date().toISOString(),
    service: 'stripe',
    action,
    ...data,
  };
  console.log('[STRIPE]', JSON.stringify(logData));
}

