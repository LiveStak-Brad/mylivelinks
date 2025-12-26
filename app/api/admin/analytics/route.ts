import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function parseBucket(value: string | null) {
  const v = (value ?? 'day').toLowerCase();
  if (v !== 'day' && v !== 'week') return null;
  return v;
}

function centsToUsd(cents: unknown) {
  const n = typeof cents === 'number' ? cents : Number(cents);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

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
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const startDate = parseDateParam(searchParams.get('start'));
    const endDate = parseDateParam(searchParams.get('end'));
    const includeTest = searchParams.get('includeTest') === 'true';
    const bucket = parseBucket(searchParams.get('bucket')) ?? 'day';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start and end are required ISO timestamps' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);

    const [{ data: overviewRows, error: overviewErr }, { data: buyers, error: buyersErr }, { data: earners, error: earnersErr }, { data: revenueSeries, error: revenueSeriesErr }, { data: coinSeries, error: coinSeriesErr }, { data: circulationStart, error: circulationStartErr }] =
      await Promise.all([
        supabase.rpc('admin_get_monetization_overview', {
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
        }),
        supabase.rpc('admin_get_top_buyers', {
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
          p_limit: 50,
        }),
        supabase.rpc('admin_get_top_earners', {
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
          p_limit: 50,
        }),
        supabase.rpc('admin_get_revenue_timeseries', {
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
          p_bucket: bucket,
        }),
        supabase.rpc('admin_get_coin_flow_timeseries', {
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
          p_bucket: bucket,
        }),
        supabase.rpc('admin_get_coin_circulation_at', {
          p_at: startDate.toISOString(),
        }),
      ]);

    if (overviewErr) return NextResponse.json({ error: overviewErr.message }, { status: 500 });
    if (buyersErr) return NextResponse.json({ error: buyersErr.message }, { status: 500 });
    if (earnersErr) return NextResponse.json({ error: earnersErr.message }, { status: 500 });
    if (revenueSeriesErr) return NextResponse.json({ error: revenueSeriesErr.message }, { status: 500 });
    if (coinSeriesErr) return NextResponse.json({ error: coinSeriesErr.message }, { status: 500 });
    if (circulationStartErr) return NextResponse.json({ error: circulationStartErr.message }, { status: 500 });

    const overview = (Array.isArray(overviewRows) ? overviewRows[0] : overviewRows) as any;

    const grossCoinSales = centsToUsd(overview?.gross_revenue_cents);
    const stripeFees = centsToUsd(overview?.stripe_fees_cents);
    const refunds = centsToUsd(overview?.refunds_cents);
    const chargebacks = centsToUsd(overview?.disputes_cents);
    const netRevenue = centsToUsd(overview?.net_revenue_cents);

    const coinsSold = Number(overview?.coins_purchased ?? 0);
    const coinsInCirculation = Number(overview?.coins_in_circulation ?? 0);
    const diamondsOutstanding = Number(overview?.diamonds_outstanding ?? 0);
    const cashoutExposure = diamondsOutstanding * 0.01;

    const totalCoinsPurchased = Number(overview?.coins_purchased ?? 0);
    const totalCoinsSpent = Number(overview?.coins_spent ?? 0);
    const totalCoinsBurned = 0;

    const totalDiamondsMinted = Number(overview?.diamonds_minted ?? 0);
    const totalDiamondsCashedOut = Number(overview?.diamonds_cashed_out ?? 0);

    const totalChargesCount = Number(overview?.charges_count ?? 0);
    const totalChargesUsd = grossCoinSales;
    const totalStripeFees = stripeFees;
    const refundsTotal = refunds;
    const disputesTotal = chargebacks;
    const netAfterStripe = grossCoinSales - stripeFees;

    const revenueOverTime = (Array.isArray(revenueSeries) ? revenueSeries : []).map((r: any) => {
      const label = r?.bucket_start ? new Date(r.bucket_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      return {
        label,
        value: centsToUsd(r?.gross_revenue_cents),
        value2: centsToUsd(r?.net_revenue_cents),
      };
    });

    const coinFlowOverTime = (Array.isArray(coinSeries) ? coinSeries : []).map((r: any) => {
      const label = r?.bucket_start ? new Date(r.bucket_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      return {
        label,
        value: Number(r?.coins_purchased ?? 0),
        value2: Number(r?.coins_spent ?? 0),
      };
    });

    let runningCirculation = Number(circulationStart ?? 0);
    const circulationOverTime = (Array.isArray(coinSeries) ? coinSeries : []).map((r: any) => {
      const label = r?.bucket_start ? new Date(r.bucket_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      runningCirculation += Number(r?.net_coins_delta ?? 0);
      return {
        label,
        value: runningCirculation,
      };
    });

    const data = {
      grossCoinSales,
      stripeFees,
      refunds,
      chargebacks,
      netRevenue,

      coinsSold,
      coinsInCirculation,
      totalCoinsPurchased,
      totalCoinsSpent,
      totalCoinsBurned,

      diamondsOutstanding,
      cashoutExposure,
      totalDiamondsMinted,
      totalDiamondsCashedOut,

      totalChargesCount,
      totalChargesUsd,
      totalStripeFees,
      refundsTotal,
      disputesTotal,
      netAfterStripe,

      revenueOverTime,
      coinFlowOverTime,
      circulationOverTime,
      coinPurchaseVsSpent: coinFlowOverTime,
      diamondMintedVsCashedOut: [],

      topCoinBuyers: (Array.isArray(buyers) ? buyers : []).map((b: any) => ({
        id: String(b?.profile_id ?? ''),
        username: String(b?.username ?? ''),
        primaryValue: centsToUsd(b?.gross_revenue_cents),
        secondaryValue: Number(b?.coins_awarded ?? 0),
      })),
      topDiamondEarners: (Array.isArray(earners) ? earners : []).map((e: any) => ({
        id: String(e?.profile_id ?? ''),
        username: String(e?.username ?? ''),
        primaryValue: Number(e?.diamonds_earned ?? 0),
        secondaryValue: Number(e?.diamonds_earned ?? 0) * 0.01,
      })),

      stripeEvents: [],

      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      includeTest,
      generatedAt: new Date().toISOString(),
      isStubData: false,
    };

    return NextResponse.json(data);
  } catch (err) {
    return authErrorToResponse(err);
  }
}


