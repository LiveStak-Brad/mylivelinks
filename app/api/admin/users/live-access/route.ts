import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => null);
    const profileId = typeof body?.profileId === 'string' ? body.profileId : null;
    const enabled = typeof body?.enabled === 'boolean' ? body.enabled : null;

    if (!profileId || enabled === null) {
      return NextResponse.json({ error: 'profileId and enabled are required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);
    const { error } = await (supabase as any).rpc('admin_set_live_access', {
      p_target_profile_id: profileId,
      p_enabled: enabled,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
