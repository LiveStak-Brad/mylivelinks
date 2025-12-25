import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createCoinCheckoutSession, logStripeAction } from '@/lib/stripe';
import { getCoinPackByPriceId, getCoinPackBySku } from '@/lib/supabase-admin';

/**
 * POST /api/coins/create-checkout
 * Create Stripe Checkout Session for coin purchase
 * 
 * Body: { packSku: string }
 * Returns: { url: string } - Stripe Checkout URL
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Parse request
    const body = await request.json();
    const { packSku, priceId } = body;

    if ((!priceId || typeof priceId !== 'string') && (!packSku || typeof packSku !== 'string')) {
      return NextResponse.json(
        { error: 'priceId or packSku is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logStripeAction('create-checkout-unauthorized', { requestId });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get coin pack from database (prefer priceId, back-compat packSku)
    const pack = priceId
      ? await getCoinPackByPriceId(priceId)
      : await getCoinPackBySku(packSku);

    if (!pack) {
      logStripeAction('create-checkout-invalid-pack', { requestId, packSku, priceId });
      return NextResponse.json(
        { error: 'Invalid coin pack' },
        { status: 400 }
      );
    }

    // Create Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mylivelinks.com';
    
    logStripeAction('create-checkout-start', {
      requestId,
      userId: user.id,
      packSku: pack.sku,
      priceId,
      coinsAmount: pack.coins_amount,
      priceCents: pack.price_cents,
    });

    const session = await createCoinCheckoutSession({
      userId: user.id,
      packSku: pack.sku,
      packName: pack.name,
      priceId: pack.stripe_price_id,
      priceCents: pack.price_cents,
      coinsAmount: pack.coins_amount,
      vipTier: pack.vip_tier || undefined,
      successUrl: `${baseUrl}/wallet?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/wallet?purchase=cancelled`,
    });

    logStripeAction('create-checkout-success', {
      requestId,
      userId: user.id,
      sessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logStripeAction('create-checkout-error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[API] create-checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}


