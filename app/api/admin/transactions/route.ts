import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();

    const supabase = createRouteHandlerClient(request);

    // Preferred newer schema: ledger_entries (if it exists).
    const attemptLedgerEntries = await supabase
      .from('ledger_entries')
      .select('id, user_id, entry_type, delta_coins, delta_diamonds, amount_usd_cents, provider_ref, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!attemptLedgerEntries.error) {
      let rows = (attemptLedgerEntries.data ?? []) as any[];
      if (q) {
        rows = rows.filter((r) => String(r.user_id || '').toLowerCase().includes(q) || String(r.entry_type || '').toLowerCase().includes(q));
      }
      return NextResponse.json({ transactions: rows, source: 'ledger_entries', limit, offset });
    }

    // Fallback: coin_ledger
    const attemptCoinLedger = await supabase
      .from('coin_ledger')
      .select('id, profile_id, amount, type, description, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (attemptCoinLedger.error) {
      return NextResponse.json({ error: attemptCoinLedger.error.message }, { status: 500 });
    }

    let rows = (attemptCoinLedger.data ?? []) as any[];
    if (q) {
      rows = rows.filter((r) => String(r.profile_id || '').toLowerCase().includes(q) || String(r.type || '').toLowerCase().includes(q));
    }

    return NextResponse.json({ transactions: rows, source: 'coin_ledger', limit, offset });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
