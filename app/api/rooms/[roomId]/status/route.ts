import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await requireAdmin(request);

    const roomId = params.roomId;
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const status = (body?.status || '').toString();

    const allowed = ['draft', 'interest', 'opening_soon', 'live', 'paused'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient(request);

    const { data, error } = await supabase
      .from('rooms')
      .update({ status })
      .eq('id', roomId)
      .select('id, status')
      .single();

    if (error) {
      console.error('[ROOMS] status update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ room: data }, { status: 200 });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
