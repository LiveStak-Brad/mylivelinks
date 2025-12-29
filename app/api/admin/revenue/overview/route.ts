import { NextRequest } from 'next/server';
import { requireAdmin, adminError, adminJson, generateReqId } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function parseDateParam(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function isNotWiredError(err: any) {
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message : '';
  return (
    code === '42P01' ||
    code === '42883' ||
    code === '42703' ||
    /relation .* does not exist/i.test(message) ||
    /function .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message)
  );
}

function safeInt(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function dayKeyUtc(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysUtc(d: Date, days: number) {
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

type DailyRow = {
  day: string;
  gross_usd_cents: number;
  net_usd_cents: number;
};

export async function GET(request: NextRequest) {
  const reqId = generateReqId();

  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const end = parseDateParam(url.searchParams.get('end')) ?? new Date();
    const start =
      parseDateParam(url.searchParams.get('start')) ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const windowStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0));
    const windowEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59));

    const admin = getSupabaseAdmin();

    // --- Coin purchases (USD)
    let purchaseRows: any[] = [];
    const purchases = await admin
      .from('coin_purchases')
      .select(
        'id, amount_usd_cents, stripe_fee_cents, stripe_net_cents, refunded_cents, disputed_cents, status, created_at'
      )
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', windowEnd.toISOString())
      .order('created_at', { ascending: true })
      .limit(10000);

    if (!purchases.error) {
      purchaseRows = (purchases.data ?? []) as any[];
    } else if (!isNotWiredError(purchases.error)) {
      return adminError(reqId, 'Failed to load coin purchases', 500, { error: purchases.error.message });
    }

    const completedPurchases = purchaseRows.filter((p) => {
      const s = String(p?.status ?? '').toLowerCase();
      return s !== 'failed' && s !== 'pending';
    });

    const grossUsdCents = completedPurchases.reduce((sum, p) => sum + safeInt(p.amount_usd_cents), 0);

    const stripeNetPresent = completedPurchases.some((p) => Number.isFinite(Number(p?.stripe_net_cents)));
    const netUsdCents = stripeNetPresent
      ? completedPurchases.reduce((sum, p) => sum + safeInt(p.stripe_net_cents), 0)
      : completedPurchases.reduce((sum, p) => {
          const gross = safeInt(p.amount_usd_cents);
          const fee = safeInt(p.stripe_fee_cents);
          const refunded = safeInt(p.refunded_cents);
          const disputed = safeInt(p.disputed_cents);
          return sum + Math.max(0, gross - fee - refunded - disputed);
        }, 0);

    // --- Daily buckets for purchases (USD)
    const dailyMap = new Map<string, { gross: number; net: number }>();
    for (const p of completedPurchases) {
      const createdAt = p?.created_at ? new Date(String(p.created_at)) : null;
      if (!createdAt || !Number.isFinite(createdAt.getTime())) continue;
      const key = dayKeyUtc(createdAt);
      const gross = safeInt(p.amount_usd_cents);
      const net = stripeNetPresent
        ? safeInt(p.stripe_net_cents)
        : Math.max(0, gross - safeInt(p.stripe_fee_cents) - safeInt(p.refunded_cents) - safeInt(p.disputed_cents));

      const prev = dailyMap.get(key) ?? { gross: 0, net: 0 };
      prev.gross += gross;
      prev.net += net;
      dailyMap.set(key, prev);
    }

    const daily: DailyRow[] = [];
    for (let d = windowStart; d <= windowEnd; d = addDaysUtc(d, 1)) {
      const key = dayKeyUtc(d);
      const v = dailyMap.get(key) ?? { gross: 0, net: 0 };
      daily.push({ day: key, gross_usd_cents: v.gross, net_usd_cents: v.net });
    }

    // --- Gifts for top creators / streams (coin-based, safe empty)
    let giftRows: any[] = [];
    const gifts = await admin
      .from('gifts')
      .select('id, recipient_id, live_stream_id, coin_amount, coins_spent, streamer_revenue, sent_at')
      .gte('sent_at', windowStart.toISOString())
      .lte('sent_at', windowEnd.toISOString())
      .order('sent_at', { ascending: false })
      .limit(20000);

    if (!gifts.error) {
      giftRows = (gifts.data ?? []) as any[];
    } else if (!isNotWiredError(gifts.error)) {
      return adminError(reqId, 'Failed to load gifts', 500, { error: gifts.error.message });
    }

    const creatorAgg = new Map<string, { coins: number; gifts: number }>();
    const streamAgg = new Map<string, { coins: number; gifts: number }>();

    for (const g of giftRows) {
      const recipientId = g?.recipient_id ? String(g.recipient_id) : null;
      const streamId = g?.live_stream_id != null ? String(g.live_stream_id) : null;
      const coins = Math.max(0, safeInt(g.streamer_revenue ?? g.coin_amount ?? g.coins_spent));

      if (recipientId) {
        const prev = creatorAgg.get(recipientId) ?? { coins: 0, gifts: 0 };
        prev.coins += coins;
        prev.gifts += 1;
        creatorAgg.set(recipientId, prev);
      }

      if (streamId) {
        const prev = streamAgg.get(streamId) ?? { coins: 0, gifts: 0 };
        prev.coins += coins;
        prev.gifts += 1;
        streamAgg.set(streamId, prev);
      }
    }

    const topCreatorIds = [...creatorAgg.entries()]
      .sort((a, b) => b[1].coins - a[1].coins)
      .slice(0, 10)
      .map(([id]) => id);

    let profilesById = new Map<string, any>();
    if (topCreatorIds.length) {
      const profRes = await admin.from('profiles').select('id, username, avatar_url').in('id', topCreatorIds);
      if (!profRes.error) {
        for (const p of profRes.data ?? []) profilesById.set(String((p as any).id), p);
      }
    }

    const top_creators = topCreatorIds.map((id) => {
      const agg = creatorAgg.get(id) ?? { coins: 0, gifts: 0 };
      const p = profilesById.get(id);
      return {
        profile_id: id,
        username: (p as any)?.username ?? null,
        avatar_url: (p as any)?.avatar_url ?? null,
        gifts_received_count: agg.gifts,
        gifts_received_coins: agg.coins,
      };
    });

    const top_streams = [...streamAgg.entries()]
      .sort((a, b) => b[1].coins - a[1].coins)
      .slice(0, 10)
      .map(([stream_id, agg]) => ({
        stream_id,
        gifts_received_count: agg.gifts,
        gifts_received_coins: agg.coins,
      }));

    return adminJson(reqId, {
      window_start_at: windowStart.toISOString(),
      window_end_at: windowEnd.toISOString(),
      currency: 'USD',
      gross_usd_cents: grossUsdCents,
      net_usd_cents: netUsdCents,
      daily,
      top_creators,
      top_streams,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return adminError(reqId, 'Unauthorized', 401);
    if (msg === 'FORBIDDEN') return adminError(reqId, 'Forbidden', 403);
    return adminError(reqId, 'Internal server error', 500);
  }
}
