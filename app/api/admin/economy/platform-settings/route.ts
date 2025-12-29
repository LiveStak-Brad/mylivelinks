import { NextRequest } from 'next/server';
import { requireAdmin, adminError, adminJson, generateReqId, createAuthedRouteHandlerClient } from '@/lib/admin';

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: NextRequest) {
  const reqId = generateReqId();

  try {
    await requireAdmin(request);

    const supabase = createAuthedRouteHandlerClient(request);
    const body = await request.json().catch(() => ({}));

    const takePercent = safeNumber(body?.take_percent);
    const payoutThresholdCents = safeNumber(body?.payout_threshold_cents);

    if (takePercent == null || takePercent < 0 || takePercent > 100) {
      return adminError(reqId, 'take_percent must be between 0 and 100', 400);
    }
    if (payoutThresholdCents == null || payoutThresholdCents < 0) {
      return adminError(reqId, 'payout_threshold_cents must be >= 0', 400);
    }

    const { data, error } = await supabase
      .from('platform_settings')
      .upsert(
        {
          id: true,
          take_percent: takePercent,
          payout_threshold_cents: Math.trunc(payoutThresholdCents),
        },
        { onConflict: 'id' }
      )
      .select('*')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      return adminError(reqId, 'Failed to update platform settings', 500, { error: error.message });
    }

    return adminJson(reqId, { platform_settings: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return adminError(reqId, 'Unauthorized', 401);
    if (msg === 'FORBIDDEN') return adminError(reqId, 'Forbidden', 403);
    return adminError(reqId, 'Internal server error', 500);
  }
}
