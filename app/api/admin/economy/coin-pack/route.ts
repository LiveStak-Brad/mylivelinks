import { NextRequest } from 'next/server';
import { requireAdmin, adminError, adminJson, generateReqId, createAuthedRouteHandlerClient } from '@/lib/admin';

function safeInt(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeBigint(v: unknown) {
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
    const sku = typeof body?.sku === 'string' ? body.sku.trim() : null;

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const platform = (typeof body?.platform === 'string' ? body.platform : 'web').toLowerCase();

    const coins = safeBigint(body?.coins);
    const priceUsd = typeof body?.price_usd === 'number' ? body.price_usd : Number(body?.price_usd);
    const isActive = body?.is_active == null ? null : Boolean(body.is_active);
    const sortOrder = body?.sort_order == null ? null : safeInt(body.sort_order);

    if (!name) return adminError(reqId, 'name is required', 400);
    if (!platform || (platform !== 'web' && platform !== 'mobile')) {
      return adminError(reqId, 'platform must be web or mobile', 400);
    }
    if (coins == null || coins < 0) return adminError(reqId, 'coins must be a non-negative number', 400);
    if (!Number.isFinite(priceUsd) || priceUsd < 0) return adminError(reqId, 'price_usd must be >= 0', 400);

    const payload: Record<string, unknown> = {
      ...(id !== null ? { id } : {}),
      name,
      platform,
      coins,
      price_usd: priceUsd,
      ...(isActive !== null ? { is_active: isActive } : {}),
      ...(sortOrder !== null ? { sort_order: sortOrder } : {}),
    };

    if (sku) payload.sku = sku;

    const query = supabase.from('coin_packs').upsert(payload, {
      ...(id !== null ? { onConflict: 'id' } : sku ? { onConflict: 'sku' } : { onConflict: 'id' }),
    });

    const res = id !== null ? await query.select('*').eq('id', id).maybeSingle() : await query.select('*').maybeSingle();

    if (res.error) {
      return adminError(reqId, 'Failed to upsert coin pack', 500, { error: res.error.message });
    }

    return adminJson(reqId, { coin_pack: res.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return adminError(reqId, 'Unauthorized', 401);
    if (msg === 'FORBIDDEN') return adminError(reqId, 'Forbidden', 403);
    return adminError(reqId, 'Internal server error', 500);
  }
}
