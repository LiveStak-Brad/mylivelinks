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
    
    // Try multiple query approaches for compatibility
    let packs: any[] = [];
    let error: any = null;

    // First try with 'active' column
    const result1 = await adminSupabase
      .from('coin_packs')
      .select('*')
      .eq('active', true)
      .order('display_order');
    
    if (!result1.error && result1.data && result1.data.length > 0) {
      packs = result1.data;
    } else {
      // Try with 'is_active' column
      const result2 = await adminSupabase
        .from('coin_packs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (!result2.error && result2.data && result2.data.length > 0) {
        packs = result2.data;
      } else {
        // Try getting all packs without filter
        const result3 = await adminSupabase
          .from('coin_packs')
          .select('*')
          .order('display_order');
        
        if (!result3.error && result3.data) {
          // Filter active ones manually
          packs = result3.data.filter((p: any) => p.active !== false && p.is_active !== false);
        }
        error = result3.error;
      }
    }

    if (error) {
      console.error('[API] coin_packs query error:', error);
    }

    // Filter by VIP tier
    const filteredPacks = packs.filter((pack: any) => {
      const packTier = pack.vip_tier ?? 0;
      return packTier <= userTier;
    });

    const normalized = filteredPacks.map((pack: any) => ({
      sku: pack.sku || pack.id,
      price_id: pack.stripe_price_id || pack.price_id || '',
      usd_amount: (pack.price_cents || pack.price_usd * 100 || 0) / 100,
      price_cents: pack.price_cents || (pack.price_usd || 0) * 100,
      coins_awarded: pack.coins_amount || pack.coins || 0,
      pack_name: pack.name || pack.pack_name || 'Coin Pack',
      is_vip: pack.is_vip || false,
      vip_tier: pack.vip_tier ?? null,
      description: pack.description,
      bonus_coins: pack.bonus_coins || 0,
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
      { error: 'Failed to fetch coin packs', packs: [] },
      { status: 500 }
    );
  }
}
