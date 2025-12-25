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

    const supabase = createRouteHandlerClient(request);

    // Primary: platform_settings key/value store (if present)
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value, updated_at')
      .order('key', { ascending: true });

    if (!error) {
      return NextResponse.json({ settings: data ?? [], source: 'platform_settings' });
    }

    // Fallback: nothing configured yet
    return NextResponse.json({ settings: [], source: 'none' });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
