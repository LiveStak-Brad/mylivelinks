import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

type LedgerSource = 'ledger_entries' | null;

async function detectLedgerSource(admin: ReturnType<typeof getSupabaseAdmin>): Promise<LedgerSource> {
  const attemptLedgerEntries = await admin.from('ledger_entries').select('id').limit(1);
  if (!attemptLedgerEntries.error) return 'ledger_entries';
  return null;
}

function bucketStartFor(date: Date, bucket: 'day' | 'week') {
  if (bucket === 'day') {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  }

  // Postgres date_trunc('week', ...) uses Monday as the start of week.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  const day = d.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d;
}

function formatBucketLabel(bucketStart: Date) {
  return bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
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
    const admin = getSupabaseAdmin();
    const ledgerSource = await detectLedgerSource(admin);

    // Prefer SQL RPCs when deployed; fall back to direct table reads when RPCs aren't installed yet.
    const rpcResults = await Promise.all([
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

    const overviewRows = rpcResults[0].error ? null : rpcResults[0].data;
    const buyers = rpcResults[1].error ? null : rpcResults[1].data;
    const earners = rpcResults[2].error ? null : rpcResults[2].data;
    const revenueSeries = rpcResults[3].error ? null : rpcResults[3].data;
    const coinSeries = rpcResults[4].error ? null : rpcResults[4].data;
    const circulationStartRaw = rpcResults[5].error ? null : rpcResults[5].data;
    const circulationStart = Array.isArray(circulationStartRaw) ? circulationStartRaw[0] : circulationStartRaw;

    const overview = (Array.isArray(overviewRows) ? overviewRows[0] : overviewRows) as any;

    // Fallback sources
    const purchasesQuery = await admin
      .from('coin_purchases')
      .select(
        'id, profile_id, coins_awarded, coin_amount, amount_usd_cents, usd_amount, stripe_fee_cents, stripe_net_cents, refunded_cents, disputed_cents, status, created_at, confirmed_at, refunded_at'
      )
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })
      .limit(5000);

    const purchaseRows = (purchasesQuery.error ? [] : purchasesQuery.data ?? []) as any[];
    const completedPurchases = purchaseRows.filter((p) => {
      const s = String(p?.status ?? '').toLowerCase();
      return s !== 'failed' && s !== 'pending';
    });
    const succeededPurchases = purchaseRows.filter((p) => {
      const s = String(p?.status ?? '').toLowerCase();
      if (s === 'failed' || s === 'pending') return false;
      if (s === 'refunded' || s === 'chargeback' || s === 'disputed') return false;
      return true;
    });

    const grossRevenueUsd = centsToUsd(
      safeNumber(overview?.gross_revenue_cents) ||
        completedPurchases.reduce((sum, p) => sum + safeNumber(p.amount_usd_cents ?? safeNumber(p.usd_amount) * 100), 0)
    );

    const stripeFeesUsd = centsToUsd(
      safeNumber(overview?.stripe_fees_cents) ||
        completedPurchases.reduce((sum, p) => sum + safeNumber(p.stripe_fee_cents), 0)
    );

    const refundsUsd = centsToUsd(
      safeNumber(overview?.refunds_cents) ||
        purchaseRows.reduce((sum, p) => sum + safeNumber(p.refunded_cents), 0)
    );

    const disputesUsd = centsToUsd(
      safeNumber(overview?.disputes_cents) ||
        purchaseRows.reduce((sum, p) => sum + safeNumber(p.disputed_cents), 0)
    );

    const netRevenueUsd = centsToUsd(
      safeNumber(overview?.net_revenue_cents) ||
        Math.round((grossRevenueUsd - stripeFeesUsd - refundsUsd - disputesUsd) * 100)
    );

    const totalCoinsPurchased =
      safeNumber(overview?.coins_purchased) ||
      succeededPurchases.reduce(
        (sum, p) => sum + safeNumber(p.coins_awarded ?? p.coin_amount ?? 0),
        0
      );

    const totalChargesCount = safeNumber(overview?.charges_count) || completedPurchases.length;

    // Circulation + outstanding balances
    // Use RPC fallback for coins, but calculate diamonds from topDiamondHolders for consistency
    let coinsInCirculation = safeNumber(overview?.coins_in_circulation);
    if (!coinsInCirculation) {
      // Fallback: sum coin_balance from profiles
      let offset = 0;
      const pageSize = 1000;
      let coinSum = 0;
      while (offset < 20000) {
        const page = await admin
          .from('profiles')
          .select('coin_balance')
          .gt('coin_balance', 0)
          .range(offset, offset + pageSize - 1);
        if (page.error) break;
        const rows = (page.data ?? []) as any[];
        if (!rows.length) break;
        for (const r of rows) {
          coinSum += safeNumber(r.coin_balance);
        }
        offset += pageSize;
      }
      coinsInCirculation = coinSum;
    }

    // Diamonds outstanding: query ALL profiles with earnings_balance > 0
    // This is the authoritative source for payout exposure
    let diamondsOutstanding = 0;
    {
      const { data: allHolders, error } = await admin
        .from('profiles')
        .select('earnings_balance')
        .gt('earnings_balance', 0);

      if (!error && allHolders) {
        diamondsOutstanding = allHolders.reduce(
          (sum: number, h: any) => sum + safeNumber(h.earnings_balance),
          0
        );
      }
    }

    // Coins spent + diamonds minted/cashed out are best sourced from a ledger.
    let totalCoinsSpent = safeNumber(overview?.coins_spent);
    let totalDiamondsMinted = safeNumber(overview?.diamonds_minted);
    let totalDiamondsCashedOut = safeNumber(overview?.diamonds_cashed_out);

    type LedgerRow = {
      created_at: string;
      entry_type?: string;
      delta_coins?: number;
      delta_diamonds?: number;
      type?: string;
      asset_type?: string;
      amount?: number;
      user_id?: string;
      profile_id?: string;
    };

    let ledgerRows: LedgerRow[] = [];
    if (ledgerSource === 'ledger_entries') {
      const le = await admin
        .from('ledger_entries')
        .select('created_at, entry_type, delta_coins, delta_diamonds, user_id')
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })
        .limit(10000);
      ledgerRows = (le.error ? [] : (le.data ?? [])) as any[];
    }

    if (!totalCoinsSpent) {
      if (ledgerSource === 'ledger_entries') {
        totalCoinsSpent = ledgerRows
          .filter((r) => r.entry_type === 'coin_spend_gift')
          .reduce((sum, r) => sum + Math.max(0, -safeNumber(r.delta_coins)), 0);
      }
    }

    if (!totalDiamondsMinted) {
      if (ledgerSource === 'ledger_entries') {
        totalDiamondsMinted = ledgerRows
          .filter((r) => r.entry_type === 'diamond_earn')
          .reduce((sum, r) => sum + Math.max(0, safeNumber(r.delta_diamonds)), 0);
      }
    }

    if (!totalDiamondsCashedOut) {
      if (ledgerSource === 'ledger_entries') {
        totalDiamondsCashedOut = ledgerRows
          .filter((r) => r.entry_type === 'diamond_debit_cashout')
          .reduce((sum, r) => sum + Math.max(0, -safeNumber(r.delta_diamonds)), 0);
      }
    }

    const cashoutExposure = diamondsOutstanding * 0.01;

    // Revenue timeseries (prefer RPC)
    const revenueOverTime = (Array.isArray(revenueSeries) ? revenueSeries : null)
      ? (revenueSeries as any[]).map((r: any) => {
          const d = r?.bucket_start ? new Date(r.bucket_start) : null;
          return {
            label: d ? formatBucketLabel(d) : '',
            value: centsToUsd(r?.gross_revenue_cents),
            value2: centsToUsd(r?.net_revenue_cents),
          };
        })
      : (() => {
          const buckets = new Map<number, { grossCents: number; netCents: number }>();
          for (const p of completedPurchases) {
            const t = new Date(p.confirmed_at ?? p.created_at);
            const b = bucketStartFor(t, bucket);
            const key = b.getTime();
            const grossCents = safeNumber(p.amount_usd_cents ?? safeNumber(p.usd_amount) * 100);
            const feeCents = safeNumber(p.stripe_fee_cents);
            const refundCents = safeNumber(p.refunded_cents);
            const disputeCents = safeNumber(p.disputed_cents);
            const netCents = grossCents - feeCents - refundCents - disputeCents;
            const cur = buckets.get(key) ?? { grossCents: 0, netCents: 0 };
            cur.grossCents += grossCents;
            cur.netCents += netCents;
            buckets.set(key, cur);
          }
          return Array.from(buckets.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([ts, v]) => ({
              label: formatBucketLabel(new Date(ts)),
              value: centsToUsd(v.grossCents),
              value2: centsToUsd(v.netCents),
            }));
        })();

    // Coin flow timeseries (prefer RPC)
    const coinFlowOverTime = (Array.isArray(coinSeries) ? coinSeries : null)
      ? (coinSeries as any[]).map((r: any) => {
          const d = r?.bucket_start ? new Date(r.bucket_start) : null;
          return {
            label: d ? formatBucketLabel(d) : '',
            value: safeNumber(r?.coins_purchased),
            value2: safeNumber(r?.coins_spent),
          };
        })
      : (() => {
          const buckets = new Map<number, { purchased: number; spent: number; delta: number }>();
          for (const r of ledgerRows) {
            const t = new Date(r.created_at);
            const b = bucketStartFor(t, bucket);
            const key = b.getTime();
            const cur = buckets.get(key) ?? { purchased: 0, spent: 0, delta: 0 };
            if (ledgerSource === 'ledger_entries') {
              if (r.entry_type === 'coin_purchase') cur.purchased += Math.max(0, safeNumber(r.delta_coins));
              if (r.entry_type === 'coin_spend_gift') cur.spent += Math.max(0, -safeNumber(r.delta_coins));
              cur.delta += safeNumber(r.delta_coins);
            }
            buckets.set(key, cur);
          }
          return Array.from(buckets.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([ts, v]) => ({ label: formatBucketLabel(new Date(ts)), value: v.purchased, value2: v.spent }));
        })();

    // Circulation over time requires a starting point.
    let runningCirculation = safeNumber(circulationStart);
    const circulationOverTime = (Array.isArray(coinSeries) ? coinSeries : null)
      ? (coinSeries as any[]).map((r: any) => {
          const d = r?.bucket_start ? new Date(r.bucket_start) : null;
          runningCirculation += safeNumber(r?.net_coins_delta);
          return { label: d ? formatBucketLabel(d) : '', value: runningCirculation };
        })
      : (() => {
          let running = coinsInCirculation;
          return coinFlowOverTime.map((p) => ({ label: p.label, value: running }));
        })();

    // Diamonds minted vs cashed out timeseries
    const diamondMintedVsCashedOut = (() => {
      const buckets = new Map<number, { minted: number; cashed: number }>();
      for (const r of ledgerRows) {
        const t = new Date(r.created_at);
        const b = bucketStartFor(t, bucket);
        const key = b.getTime();
        const cur = buckets.get(key) ?? { minted: 0, cashed: 0 };

        if (ledgerSource === 'ledger_entries') {
          if (r.entry_type === 'diamond_earn') cur.minted += Math.max(0, safeNumber(r.delta_diamonds));
          if (r.entry_type === 'diamond_debit_cashout') cur.cashed += Math.max(0, -safeNumber(r.delta_diamonds));
        }

        buckets.set(key, cur);
      }

      return Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([ts, v]) => ({
          label: formatBucketLabel(new Date(ts)),
          value: v.minted,
          value2: v.cashed,
        }));
    })();

    // Stripe events table: derived from purchases (real rows)
    const stripeEvents = (() => {
      const events: any[] = [];
      for (const p of purchaseRows) {
        const created = p.confirmed_at ?? p.created_at;
        const grossUsd = centsToUsd(p.amount_usd_cents ?? safeNumber(p.usd_amount) * 100);
        const feeUsd = centsToUsd(p.stripe_fee_cents);
        const netUsd = grossUsd - feeUsd;
        const status = String(p.status ?? '').toLowerCase();

        const chargeStatus = ((): 'succeeded' | 'failed' | 'refunded' | 'disputed' => {
          if (status === 'failed') return 'failed';
          if (status === 'refunded') return 'refunded';
          if (status === 'disputed' || status === 'chargeback') return 'disputed';
          return 'succeeded';
        })();

        if (status !== 'failed' && status !== 'pending') {
          events.push({
            id: `charge_${p.id}`,
            date: created,
            amount: grossUsd,
            fees: feeUsd,
            net: netUsd,
            status: chargeStatus,
            type: 'charge',
          });
        }

        const refundedCents = safeNumber(p.refunded_cents);
        if (refundedCents > 0 || status === 'refunded') {
          events.push({
            id: `refund_${p.id}`,
            date: p.refunded_at ?? created,
            amount: centsToUsd(refundedCents || (p.amount_usd_cents ?? safeNumber(p.usd_amount) * 100)),
            fees: 0,
            net: -centsToUsd(refundedCents || (p.amount_usd_cents ?? safeNumber(p.usd_amount) * 100)),
            status: 'refunded',
            type: 'refund',
          });
        }

        const disputedCents = safeNumber(p.disputed_cents);
        if (disputedCents > 0 || status === 'disputed' || status === 'chargeback') {
          events.push({
            id: `dispute_${p.id}`,
            date: created,
            amount: centsToUsd(disputedCents || (p.amount_usd_cents ?? safeNumber(p.usd_amount) * 100)),
            fees: 0,
            net: -centsToUsd(disputedCents || (p.amount_usd_cents ?? safeNumber(p.usd_amount) * 100)),
            status: 'disputed',
            type: 'dispute',
          });
        }
      }
      return events
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 100);
    })();

    // Top buyers/earners (prefer RPC)
    const topCoinBuyers = Array.isArray(buyers)
      ? (buyers as any[]).map((b: any) => ({
          id: String(b?.profile_id ?? ''),
          username: String(b?.username ?? ''),
          primaryValue: centsToUsd(b?.gross_revenue_cents),
          secondaryValue: safeNumber(b?.coins_awarded),
        }))
      : (() => {
          const byProfile = new Map<string, { grossCents: number; coins: number }>();
          for (const p of succeededPurchases) {
            const id = String(p.profile_id ?? '');
            if (!id) continue;
            const cur = byProfile.get(id) ?? { grossCents: 0, coins: 0 };
            cur.grossCents += safeNumber(p.amount_usd_cents ?? safeNumber(p.usd_amount) * 100);
            cur.coins += safeNumber(p.coins_awarded ?? p.coin_amount ?? 0);
            byProfile.set(id, cur);
          }

          const ids = Array.from(byProfile.keys());
          return ids
            .map((id) => ({
              id,
              username: id,
              primaryValue: centsToUsd(byProfile.get(id)?.grossCents ?? 0),
              secondaryValue: byProfile.get(id)?.coins ?? 0,
            }))
            .sort((a, b) => b.primaryValue - a.primaryValue)
            .slice(0, 50);
        })();

    const topDiamondEarners = Array.isArray(earners)
      ? (earners as any[]).map((e: any) => ({
          id: String(e?.profile_id ?? ''),
          username: String(e?.username ?? ''),
          primaryValue: safeNumber(e?.diamonds_earned),
          secondaryValue: safeNumber(e?.diamonds_earned) * 0.01,
        }))
      : (() => {
          const byProfile = new Map<string, number>();
          for (const r of ledgerRows) {
            if (ledgerSource === 'ledger_entries') {
              if (r.entry_type !== 'diamond_earn') continue;
              const id = String(r.user_id ?? '');
              if (!id) continue;
              byProfile.set(id, (byProfile.get(id) ?? 0) + Math.max(0, safeNumber(r.delta_diamonds)));
            }
          }

          return Array.from(byProfile.entries())
            .map(([id, diamonds]) => ({
              id,
              username: id,
              primaryValue: diamonds,
              secondaryValue: diamonds * 0.01,
            }))
            .sort((a, b) => b.primaryValue - a.primaryValue)
            .slice(0, 50);
        })();

    // Top Diamond Holders: CURRENT wallet balance (profiles.earnings_balance)
    // This is the authoritative source for payout exposure - NOT lifetime earned
    const topDiamondHolders = await (async () => {
      const { data: holders, error } = await admin
        .from('profiles')
        .select('id, username, earnings_balance')
        .gt('earnings_balance', 0)
        .order('earnings_balance', { ascending: false })
        .limit(50);

      if (error || !holders) return [];

      return holders.map((h: any) => ({
        id: String(h.id ?? ''),
        username: String(h.username ?? ''),
        primaryValue: safeNumber(h.earnings_balance),
        secondaryValue: safeNumber(h.earnings_balance) * 0.01, // Est. USD at $0.01/diamond
      }));
    })();

    const data = {
      grossCoinSales: grossRevenueUsd,
      stripeFees: stripeFeesUsd,
      refunds: refundsUsd,
      chargebacks: disputesUsd,
      netRevenue: netRevenueUsd,

      coinsSold: totalCoinsPurchased,
      coinsInCirculation,
      diamondsOutstanding,
      cashoutExposure,

      totalCoinsPurchased,
      totalCoinsSpent,
      totalCoinsBurned: 0,
      totalDiamondsMinted,
      totalDiamondsCashedOut,

      totalChargesCount,
      totalChargesUsd: grossRevenueUsd,
      totalStripeFees: stripeFeesUsd,
      refundsTotal: refundsUsd,
      disputesTotal: disputesUsd,
      netAfterStripe: grossRevenueUsd - stripeFeesUsd,

      revenueOverTime,
      coinFlowOverTime,
      circulationOverTime,
      coinPurchaseVsSpent: coinFlowOverTime,
      diamondMintedVsCashedOut,

      topCoinBuyers,
      topDiamondEarners,
      topDiamondHolders,

      stripeEvents,

      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      includeTest,
      generatedAt: new Date().toISOString(),
      isStubData: false,
      sources: {
        ledger: ledgerSource,
        usedRpc: {
          overview: !rpcResults[0].error,
          buyers: !rpcResults[1].error,
          earners: !rpcResults[2].error,
          revenueSeries: !rpcResults[3].error,
          coinSeries: !rpcResults[4].error,
        },
      },
    };

    return NextResponse.json(data);
  } catch (err) {
    return authErrorToResponse(err);
  }
}


