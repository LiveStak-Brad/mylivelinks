import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireOwner } from '@/lib/rbac';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const ENDPOINT = '/api/owner/feature-flags';

function logJson(level: 'info' | 'warn' | 'error', params: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ level, ...params }));
  } catch {
    console.log(String(params));
  }
}

export async function GET(request: NextRequest) {
  const reqId = request.headers.get('x-request-id') || randomUUID();

  try {
    await requireOwner(request);

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('feature_flags')
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      logJson('error', { reqId, endpoint: ENDPOINT, event: 'fetch_failed', error: error.message });
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, flags: data ?? [] }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const status = msg === 'UNAUTHORIZED' ? 401 : 403;
    return NextResponse.json({ ok: false, error: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status });
  }
}

export async function POST(request: NextRequest) {
  const reqId = request.headers.get('x-request-id') || randomUUID();

  let userId = '';
  try {
    const user = await requireOwner(request);
    userId = user.id;

    const body = await request.json().catch(() => ({}));
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    const enabled = body?.enabled;

    if (!key) {
      return NextResponse.json({ ok: false, error: 'Invalid key' }, { status: 400 });
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'Invalid enabled (must be boolean)' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const supabase = createRouteHandlerClient(request);

    // Prefer the RPC if present (it can handle audit logging). Fall back to direct update if missing.
    let rpcError: unknown = null;
    try {
      const rpcRes = await supabase.rpc('update_feature_flag', {
        p_key: key,
        p_enabled: enabled,
        p_changed_by: userId,
        p_ip_address: ip,
        p_user_agent: userAgent,
      });
      if (rpcRes?.error) rpcError = rpcRes.error;
    } catch (e: unknown) {
      rpcError = e;
    }

    if (rpcError) {
      const admin = getSupabaseAdmin();
      const upsert = await admin
        .from('feature_flags')
        .upsert({ key, enabled }, { onConflict: 'key' })
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (upsert.error) {
        logJson('error', { reqId, endpoint: ENDPOINT, event: 'update_failed', error: upsert.error.message });
        return NextResponse.json({ ok: false, error: upsert.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, flag: upsert.data ?? { key, enabled } }, { status: 200 });
    }

    const admin = getSupabaseAdmin();
    const { data: flag, error: fetchError } = await admin
      .from('feature_flags')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ ok: true, flag: { key, enabled } }, { status: 200 });
    }

    return NextResponse.json({ ok: true, flag: flag ?? { key, enabled } }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const status = msg === 'UNAUTHORIZED' ? 401 : 403;
    logJson('warn', { reqId, endpoint: ENDPOINT, event: 'auth_failed', userId, error: msg || String(err) });
    return NextResponse.json({ ok: false, error: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status });
  }
}
