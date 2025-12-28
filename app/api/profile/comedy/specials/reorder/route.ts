import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';

export async function POST(request: NextRequest) {
  const supabase = createAuthedRouteHandlerClient(request);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds.filter((x: any) => typeof x === 'string') : null;

  if (!orderedIds || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds is required' }, { status: 400 });
  }

  const { error } = await supabase.rpc('reorder_comedy_specials', { p_ordered_ids: orderedIds });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
