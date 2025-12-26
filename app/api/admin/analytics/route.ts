import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/admin/analytics
 * 
 * Query params:
 * - start: ISO date string (required)
 * - end: ISO date string (required)
 * - includeTest: boolean (default: false)
 * 
 * Returns analytics data for the monetization dashboard.
 * Owner/admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_owner, is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_owner && !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const includeTest = searchParams.get('includeTest') === 'true';
    
    if (!start || !end) {
      return NextResponse.json({ error: 'start and end dates are required' }, { status: 400 });
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // TODO: Implement actual queries once the schema is finalized
    // For now, return stub data structure
    
    // Example queries that would be needed:
    // 1. Coin purchases from stripe_payments or coin_transactions
    // 2. Gifts sent (coins spent) from gift_transactions
    // 3. Diamond balances from profiles.earnings_balance
    // 4. Stripe fees from stripe webhook data
    // 5. Refunds/chargebacks from stripe data
    // 6. Top buyers aggregation
    // 7. Top earners aggregation
    
    const data = {
      // Revenue
      grossCoinSales: 0,
      stripeFees: 0,
      refunds: 0,
      chargebacks: 0,
      netRevenue: 0,
      
      // Coins
      coinsSold: 0,
      coinsInCirculation: 0,
      totalCoinsPurchased: 0,
      totalCoinsSpent: 0,
      totalCoinsBurned: 0,
      
      // Diamonds
      diamondsOutstanding: 0,
      cashoutExposure: 0,
      totalDiamondsMinted: 0,
      totalDiamondsCashedOut: 0,
      
      // Stripe
      totalChargesCount: 0,
      totalChargesUsd: 0,
      totalStripeFees: 0,
      refundsTotal: 0,
      disputesTotal: 0,
      netAfterStripe: 0,
      
      // Charts (empty arrays - to be populated)
      revenueOverTime: [],
      coinFlowOverTime: [],
      circulationOverTime: [],
      coinPurchaseVsSpent: [],
      diamondMintedVsCashedOut: [],
      
      // Top users (empty arrays - to be populated)
      topCoinBuyers: [],
      topDiamondEarners: [],
      
      // Stripe events (empty array - to be populated)
      stripeEvents: [],
      
      // Meta
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      includeTest,
      generatedAt: new Date().toISOString(),
      isStubData: true,
    };
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


