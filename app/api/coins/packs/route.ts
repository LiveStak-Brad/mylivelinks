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
    
    // Get packs available to this user's tier
    const { data: packs, error } = await adminSupabase
      .from('coin_packs')
      .select('*')
      .eq('active', true)
      .lte('vip_tier', userTier)
      .order('display_order');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      packs: (packs || []).map((pack: any) => ({
        sku: pack.sku,
        name: pack.name,
        coins: pack.coins_amount,
        priceUsd: pack.price_cents / 100,
        priceCents: pack.price_cents,
        isVip: pack.is_vip || false,
        description: pack.description,
        valuePercent: pack.value_percent || 60,
      })),
    });
  } catch (error) {
    console.error('[API] get-packs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin packs' },
      { status: 500 }
    );
  }
}

