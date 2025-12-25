import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/coins/packs
 * Get available coin packs for the current user (respects VIP tier)
 * 
 * Returns: Array of coin packs
 */
export async function GET(request: NextRequest) {
  try {
    const adminSupabase = getSupabaseAdmin();
    
    // Try to get authenticated user for VIP tier check
    let userTier = 0;
    try {
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

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('vip_tier')
          .eq('id', user.id)
          .single();
        
        userTier = profile?.vip_tier || 0;
      }
    } catch (authErr) {
      // Not authenticated, use tier 0
    }
    
    // Get packs available to this user's tier (Stripe-backed via coin_packs table)
    const { data: packs, error } = await adminSupabase
      .from('coin_packs')
      .select('*')
      .eq('active', true)
      .not('stripe_price_id', 'is', null)
      .or(`vip_tier.is.null,vip_tier.lte.${userTier}`)
      .order('display_order');

    if (error) {
      throw error;
    }

    const normalized = (packs || []).map((pack: any) => ({
      sku: pack.sku,
      price_id: pack.stripe_price_id,
      usd_amount: pack.price_cents / 100,
      price_cents: pack.price_cents,
      coins_awarded: pack.coins_amount,
      pack_name: pack.name,
      is_vip: pack.is_vip || false,
      vip_tier: pack.vip_tier ?? null,
      description: pack.description,
    }));

    // Sort order:
    // - Standard packs first (ascending USD)
    // - VIP packs after (ascending vip_tier)
    normalized.sort((a: any, b: any) => {
      if (a.is_vip !== b.is_vip) return a.is_vip ? 1 : -1;
      if (!a.is_vip) return (a.price_cents || 0) - (b.price_cents || 0);
      return (a.vip_tier || 0) - (b.vip_tier || 0) || (a.price_cents || 0) - (b.price_cents || 0);
    });

    return NextResponse.json({
      packs: normalized.map(({ price_cents, ...rest }: any) => rest),
    });
  } catch (error) {
    console.error('[API] get-packs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin packs' },
      { status: 500 }
    );
  }
}

