import { NextRequest } from 'next/server';
import { requireAdmin, adminError, adminJson, generateReqId, createAuthedRouteHandlerClient } from '@/lib/admin';

function safeInt(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export async function POST(request: NextRequest) {
  const reqId = generateReqId();

  try {
    await requireAdmin(request);

    const supabase = createAuthedRouteHandlerClient(request);
    const body = await request.json().catch(() => ({}));

    const id = body?.id != null ? safeInt(body.id) : null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const coinCost = safeInt(body?.coin_cost);
    const isActive = body?.is_active == null ? null : Boolean(body.is_active);
    const sortOrder = body?.sort_order == null ? null : safeInt(body.sort_order);

    if (!name) return adminError(reqId, 'name is required', 400);
    if (coinCost == null || coinCost < 0) return adminError(reqId, 'coin_cost must be a non-negative integer', 400);

    const payload: Record<string, unknown> = {
      ...(id !== null ? { id } : {}),
      name,
      coin_cost: coinCost,
      ...(isActive !== null ? { is_active: isActive } : {}),
      ...(sortOrder !== null ? { sort_order: sortOrder } : {}),
    };

    const query = supabase.from('gift_types').upsert(payload, {
      ...(id !== null ? { onConflict: 'id' } : { onConflict: 'id' }),
    });

    const res = id !== null ? await query.select('*').eq('id', id).maybeSingle() : await query.select('*').maybeSingle();

    if (res.error) {
      return adminError(reqId, 'Failed to upsert gift type', 500, { error: res.error.message });
    }

    return adminJson(reqId, { gift_type: res.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return adminError(reqId, 'Unauthorized', 401);
    if (msg === 'FORBIDDEN') return adminError(reqId, 'Forbidden', 403);
    return adminError(reqId, 'Internal server error', 500);
  }
}
