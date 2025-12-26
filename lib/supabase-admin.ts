import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client (Service Role)
 * Use for server-side operations that bypass RLS
 * NEVER expose this on the client
 */

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * Finalize coin purchase in database (idempotent)
 */
export async function finalizeCoinPurchase(params: {
  userId: string;
  coinsAmount: number;
  amountCents: number;
  sessionId: string;
}): Promise<{ success: boolean; ledgerId?: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  const idempotencyKey = `stripe:checkout:${params.sessionId}`;

  try {
    const { data, error } = await supabase.rpc('finalize_coin_purchase', {
      p_idempotency_key: idempotencyKey,
      p_user_id: params.userId,
      p_coins_amount: params.coinsAmount,
      p_amount_usd_cents: params.amountCents,
      p_provider_ref: params.sessionId,
    });

    if (error) {
      console.error('[DB] finalize_coin_purchase error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ledgerId: data };
  } catch (err) {
    console.error('[DB] finalize_coin_purchase exception:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Record Stripe event for idempotency checking
 */
export async function recordStripeEvent(params: {
  eventId: string;
  eventType: string;
  requestId?: string;
}): Promise<{ alreadyProcessed: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase.from('stripe_events').insert({
      event_id: params.eventId,
      event_type: params.eventType,
      processed: true,
      request_id: params.requestId,
    });

    if (error) {
      // Check if it's a duplicate (already processed)
      if (error.code === '23505') {
        // Unique violation
        return { alreadyProcessed: true };
      }
      return { alreadyProcessed: false, error: error.message };
    }

    return { alreadyProcessed: false };
  } catch (err) {
    return { alreadyProcessed: false, error: String(err) };
  }
}

/**
 * Get coin pack by SKU
 */
export async function getCoinPackBySku(sku: string): Promise<{
  id: number;
  sku: string;
  name: string;
  coins_amount: number;
  price_cents: number;
  stripe_price_id?: string;
  vip_tier?: number;
  is_vip?: boolean;
  description?: string;
} | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('coin_packs')
    .select('*')
    .eq('sku', sku)
    .eq('active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get coin pack by Stripe price ID
 */
export async function getCoinPackByPriceId(priceId: string): Promise<{
  id: number;
  sku: string;
  name: string;
  coins_amount: number;
  price_cents: number;
  stripe_price_id?: string;
  vip_tier?: number;
  is_vip?: boolean;
  description?: string;
} | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('coin_packs')
    .select('*')
    .eq('stripe_price_id', priceId)
    .eq('active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get all active coin packs
 */
export async function getActiveCoinPacks(): Promise<Array<{
  id: number;
  sku: string;
  name: string;
  coins_amount: number;
  price_cents: number;
}>> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('coin_packs')
    .select('*')
    .eq('active', true)
    .order('display_order');

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Get or create connect account for user
 */
export async function getConnectAccount(userId: string): Promise<{
  stripe_account_id: string;
  payouts_enabled: boolean;
  onboarding_complete: boolean;
} | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('connect_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Save connect account to database
 */
export async function saveConnectAccount(params: {
  userId: string;
  stripeAccountId: string;
  accountType?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('connect_accounts').upsert({
    user_id: params.userId,
    stripe_account_id: params.stripeAccountId,
    account_type: params.accountType || 'express',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update connect account status
 */
export async function updateConnectAccountStatus(params: {
  stripeAccountId: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  country?: string;
  disabledReason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('connect_accounts')
    .update({
      payouts_enabled: params.payoutsEnabled,
      charges_enabled: params.chargesEnabled,
      details_submitted: params.detailsSubmitted,
      country: params.country,
      onboarding_complete: params.payoutsEnabled && params.detailsSubmitted,
      disabled_reason: params.disabledReason,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', params.stripeAccountId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Complete cashout after Stripe transfer
 */
export async function completeCashout(
  cashoutId: number,
  stripeTransferId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('complete_cashout', {
    p_cashout_id: cashoutId,
    p_stripe_transfer_id: stripeTransferId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fail cashout and refund diamonds
 */
export async function failCashout(
  cashoutId: number,
  failureReason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('fail_cashout', {
    p_cashout_id: cashoutId,
    p_failure_reason: failureReason,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<{
  id: string;
  username: string;
  coin_balance: number;
  earnings_balance: number;
} | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, coin_balance, earnings_balance')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}




