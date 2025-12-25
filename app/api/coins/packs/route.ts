import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const json = (body: any, init?: { status?: number }) =>
      NextResponse.json(body, {
        status: init?.status ?? 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    
    // Query all active *Stripe-backed* coin packs (must have a Stripe price_id to be purchasable)
    // Be robust to schema variants across environments.
    let packs: any[] | null = null;
    let queryError: any = null;

    const baseQuery = () =>
      adminSupabase
        .from('coin_packs')
        .select('*')
        .not('stripe_price_id', 'is', null)
        .neq('stripe_price_id', '');

    const tryQuery = async (mode: 'active' | 'is_active', withOrder: boolean) => {
      let q = baseQuery().eq(mode, true);
      if (withOrder) {
        q = q.order('display_order', { ascending: true });
      }
      return q;
    };

    // Preferred: active + display_order
    {
      const { data, error } = await tryQuery('active', true);
      if (!error) packs = data;
      else queryError = error;
    }

    // Fallback: active without display_order
    if (!packs && queryError) {
      const { data, error } = await tryQuery('active', false);
      if (!error) {
        packs = data;
        queryError = null;
      }
    }

    // Fallback: is_active + display_order
    if (!packs && queryError) {
      const { data, error } = await tryQuery('is_active', true);
      if (!error) {
        packs = data;
        queryError = null;
      }
    }

    // Fallback: is_active without display_order
    if (!packs && queryError) {
      const { data, error } = await tryQuery('is_active', false);
      if (!error) {
        packs = data;
        queryError = null;
      }
    }

    if (queryError) {
      console.error('[API] coin_packs query error:', queryError);
      return json(
        {
          packs: [],
          error: 'Database query failed',
          message: queryError?.message,
          code: queryError?.code,
          details: queryError?.details,
          hint: queryError?.hint,
        },
        { status: 500 }
      );
    }

    if (!packs || packs.length === 0) {
      return json({ packs: [] });
    }

    // Normalize pack data to consistent shape
    const normalized = packs.map((pack: any) => ({
      sku: pack.sku || `pack_${pack.id}`,
      price_id: pack.stripe_price_id,
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

    return json({ packs: normalized });
  } catch (error) {
    console.error('[API] get-packs error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { packs: [], error: 'Failed to fetch coin packs', message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
