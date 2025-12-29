import { NextRequest } from 'next/server';
import { requireAdmin, adminError, adminJson, generateReqId, createAuthedRouteHandlerClient } from '@/lib/admin';

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  const reqId = generateReqId();

  try {
    await requireAdmin(request);

    const supabase = createAuthedRouteHandlerClient(request);

    const [coinPacksRes, giftTypesRes, platformSettingsRes] = await Promise.all([
      supabase
        .from('coin_packs')
        .select('*')
        .order('platform', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('display_order', { ascending: true }),
      supabase
        .from('gift_types')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('display_order', { ascending: true }),
      supabase.from('platform_settings').select('*').eq('id', true).maybeSingle(),
    ]);

    if (coinPacksRes.error) {
      return adminError(reqId, 'Failed to load coin packs', 500, { error: coinPacksRes.error.message });
    }
    if (giftTypesRes.error) {
      return adminError(reqId, 'Failed to load gift types', 500, { error: giftTypesRes.error.message });
    }

    const platformSettingsRaw = platformSettingsRes.error ? null : platformSettingsRes.data;

    const takePercent = safeNumber((platformSettingsRaw as any)?.take_percent);
    const payoutThresholdCents = safeNumber((platformSettingsRaw as any)?.payout_threshold_cents);

    return adminJson(reqId, {
      coin_packs: coinPacksRes.data ?? [],
      gift_types: giftTypesRes.data ?? [],
      platform_settings: {
        take_percent: Number.isFinite(takePercent) && takePercent > 0 ? takePercent : 30,
        payout_threshold_cents:
          Number.isFinite(payoutThresholdCents) && payoutThresholdCents > 0 ? payoutThresholdCents : 5000,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return adminError(reqId, 'Unauthorized', 401);
    if (msg === 'FORBIDDEN') return adminError(reqId, 'Forbidden', 403);
    return adminError(reqId, 'Internal server error', 500);
  }
}
