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
