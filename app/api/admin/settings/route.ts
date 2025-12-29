import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient, requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const supabase = createAuthedRouteHandlerClient(request);

    const { data, error } = await supabase
      .from('platform_settings_kv')
      .select('key, value, updated_at')
      .order('key', { ascending: true });

    if (!error) {
      return NextResponse.json({ settings: data ?? [], source: 'platform_settings_kv' });
    }

    return NextResponse.json({ settings: [], source: 'none' });
  } catch (err) {
    return authErrorToResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const supabase = createAuthedRouteHandlerClient(request);
    const body = await request.json().catch(() => ({}));

    const updatesRaw = Array.isArray((body as any)?.updates)
      ? (body as any).updates
      : (body as any)?.key
        ? [{ key: (body as any).key, value: (body as any).value }]
        : [];

    const updates = updatesRaw
      .map((u: any) => ({
        key: typeof u?.key === 'string' ? u.key.trim() : '',
        value: u?.value ?? null,
      }))
      .filter((u: any) => u.key);

    if (!updates.length) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    if (updates.length > 100) {
      return NextResponse.json({ error: 'Too many updates' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('platform_settings_kv')
      .upsert(
        updates.map((u: any) => ({ key: u.key, value: u.value })),
        { onConflict: 'key' }
      )
      .select('key, value, updated_at');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, settings: data ?? [], source: 'platform_settings_kv' }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
