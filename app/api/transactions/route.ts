import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type NormalizedTransactionType = 'coin_purchase' | 'gift_sent' | 'gift_received' | 'conversion' | 'cashout';
type NormalizedAsset = 'coin' | 'diamond' | 'usd';
type NormalizedDirection = 'in' | 'out';

type NormalizedTransaction = {
  id: string;
  type: NormalizedTransactionType;
  asset: NormalizedAsset;
  amount: number;
  direction: NormalizedDirection;
  description: string;
  created_at: string;
};

function toIsoString(value: any): string {
  if (!value) return new Date(0).toISOString();
  if (typeof value === 'string') return value;
  try {
    return new Date(value).toISOString();
  } catch {
    return String(value);
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');

    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 50);
    const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0);
    const fetchCount = Math.min(limit + offset, 200);

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions: NormalizedTransaction[] = [];

    // 1) Ledger entries (covers purchases, gifts, cashout debits in most deployments)
    {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('id, entry_type, delta_coins, delta_diamonds, amount_usd_cents, provider_ref, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, fetchCount - 1);

      if (!error && data) {
        for (const row of data as any[]) {
          const entryType = row.entry_type as string;
          const createdAt = toIsoString(row.created_at);

          if (entryType === 'coin_purchase') {
            transactions.push({
              id: `le:${row.id}`,
              type: 'coin_purchase',
              asset: 'coin',
              amount: Number(row.delta_coins || 0),
              direction: 'in',
              description: 'Coin purchase',
              created_at: createdAt,
            });
            continue;
          }

          if (entryType === 'coin_spend_gift') {
            const amt = Math.abs(Number(row.delta_coins || 0));
            transactions.push({
              id: `le:${row.id}`,
              type: 'gift_sent',
              asset: 'coin',
              amount: amt,
              direction: 'out',
              description: 'Gift sent',
              created_at: createdAt,
            });
            continue;
          }

          if (entryType === 'diamond_earn') {
            const amt = Math.abs(Number(row.delta_diamonds || 0));
            transactions.push({
              id: `le:${row.id}`,
              type: 'gift_received',
              asset: 'diamond',
              amount: amt,
              direction: 'in',
              description: 'Gift received',
              created_at: createdAt,
            });
            continue;
          }

          if (entryType === 'diamond_debit_cashout') {
            const cents = Number(row.amount_usd_cents ?? Math.abs(Number(row.delta_diamonds || 0)));
            transactions.push({
              id: `le:${row.id}`,
              type: 'cashout',
              asset: 'usd',
              amount: cents,
              direction: 'out',
              description: 'Cashout',
              created_at: createdAt,
            });
            continue;
          }
        }
      }
    }

    // 1c) Gifts fallback for gift_received (diamonds) and/or gift_sent (if ledger is absent)
    {
      // Attempt newer schema first
      const attemptNew = await supabase
        .from('gifts')
        .select('id, sender_id, recipient_id, coins_spent, diamonds_awarded, created_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(0, fetchCount - 1);

      let rows: any[] | null = null;
      let useSentAt = false;

      if (!attemptNew.error && attemptNew.data) {
        rows = attemptNew.data as any[];
      } else {
        const attemptOld = await supabase
          .from('gifts')
          .select('id, sender_id, recipient_id, coin_amount, streamer_revenue, sent_at')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('sent_at', { ascending: false })
          .range(0, fetchCount - 1);

        if (!attemptOld.error && attemptOld.data) {
          rows = attemptOld.data as any[];
          useSentAt = true;
        }
      }

      if (rows) {
        for (const row of rows) {
          const createdAt = toIsoString(useSentAt ? row.sent_at : row.created_at);
          if (row.sender_id === user.id) {
            const coins = Number(row.coins_spent ?? row.coin_amount ?? 0);
            transactions.push({
              id: `gf:sent:${row.id}`,
              type: 'gift_sent',
              asset: 'coin',
              amount: Math.abs(coins),
              direction: 'out',
              description: 'Gift sent',
              created_at: createdAt,
            });
          }
          if (row.recipient_id === user.id) {
            const diamonds = Number(row.diamonds_awarded ?? row.streamer_revenue ?? 0);
            transactions.push({
              id: `gf:recv:${row.id}`,
              type: 'gift_received',
              asset: 'diamond',
              amount: Math.abs(diamonds),
              direction: 'in',
              description: 'Gift received',
              created_at: createdAt,
            });
          }
        }
      }
    }

    // 2) Cashouts table (preferred for cashout history & status) - avoid duplicates by idempotency
    {
      const { data, error } = await supabase
        .from('cashouts')
        .select('id, amount_usd_cents, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, fetchCount - 1);

      if (!error && data) {
        for (const row of data as any[]) {
          const already = transactions.some((t) => t.id === `co:${row.id}`);
          if (already) continue;

          transactions.push({
            id: `co:${row.id}`,
            type: 'cashout',
            asset: 'usd',
            amount: Number(row.amount_usd_cents || 0),
            direction: 'out',
            description: row.status ? `Cashout (${row.status})` : 'Cashout',
            created_at: toIsoString(row.created_at),
          });
        }
      }
    }

    // 3) Diamond conversions (optional feature)
    {
      const { data, error } = await supabase
        .from('diamond_conversions')
        .select('id, diamonds_in, coins_out, status, completed_at, created_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, fetchCount - 1);

      if (!error && data) {
        for (const row of data as any[]) {
          const createdAt = toIsoString(row.completed_at || row.created_at);
          const diamondsIn = Number(row.diamonds_in || 0);
          const coinsOut = Number(row.coins_out || 0);

          transactions.push({
            id: `cv:d:${row.id}`,
            type: 'conversion',
            asset: 'diamond',
            amount: diamondsIn,
            direction: 'out',
            description: coinsOut ? `Converted to ${coinsOut} coins` : 'Diamond conversion',
            created_at: createdAt,
          });

          if (coinsOut > 0) {
            transactions.push({
              id: `cv:c:${row.id}`,
              type: 'conversion',
              asset: 'coin',
              amount: coinsOut,
              direction: 'in',
              description: 'Diamond conversion',
              created_at: createdAt,
            });
          }
        }
      }
    }

    // Sort newest first (server-side normalization can mix sources)
    transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply pagination after merge
    const sliced = transactions.slice(offset, offset + limit);

    return NextResponse.json({
      transactions: sliced,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] transactions error:', error);
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
  }
}
