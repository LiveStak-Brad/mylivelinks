import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/coins/packs
 * 
 * Single source of truth for coin packs.
 * Returns all active coin packs from database.
 * UI handles VIP gating based on user's tier and owner status.
 * 
 * Returns pack shape:
 * {
 *   sku: string
 *   price_id: string
 *   usd_amount: number        // dollars (e.g., 100 = $100)
 *   coins_awarded: number
 *   pack_name: string
 *   description?: string
 *   is_vip: boolean
 *   vip_tier: number | null
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const adminSupabase = getSupabaseAdmin();
    
    // Query all active coin packs
    const { data: packs, error } = await adminSupabase
      .from('coin_packs')
      .select('*')
      .or('active.eq.true,is_active.eq.true')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[API] coin_packs query error:', error);
      return NextResponse.json({ packs: [], error: 'Database query failed' }, { status: 500 });
    }

    if (!packs || packs.length === 0) {
      return NextResponse.json({ packs: [] });
    }

    // Normalize pack data to consistent shape
    const normalized = packs.map((pack: any) => ({
      sku: pack.sku || `pack_${pack.id}`,
      price_id: pack.stripe_price_id || '',
      usd_amount: pack.price_cents ? pack.price_cents / 100 : (pack.price_usd || 0),
      coins_awarded: pack.coins_amount || pack.coins || 0,
      pack_name: pack.name || pack.pack_name || 'Coin Pack',
      description: pack.description || null,
      is_vip: pack.is_vip === true,
      vip_tier: pack.vip_tier ?? null,
    }));

    // Sort: Standard packs by USD ascending, then VIP packs by tier ascending
    normalized.sort((a: any, b: any) => {
      if (a.is_vip !== b.is_vip) return a.is_vip ? 1 : -1;
      if (!a.is_vip) return a.usd_amount - b.usd_amount;
      const tierDiff = (a.vip_tier ?? 0) - (b.vip_tier ?? 0);
      if (tierDiff !== 0) return tierDiff;
      return a.usd_amount - b.usd_amount;
    });

    return NextResponse.json({ packs: normalized });
  } catch (error) {
    console.error('[API] get-packs error:', error);
    return NextResponse.json(
      { packs: [], error: 'Failed to fetch coin packs' },
      { status: 500 }
    );
  }
}
