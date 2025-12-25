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
    const streamId = body?.stream_id;

    if (!streamId) {
      return NextResponse.json({ error: 'Missing stream_id' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);
    const { error } = await supabase.rpc('admin_end_stream', {
      p_stream_id: Number(streamId),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
