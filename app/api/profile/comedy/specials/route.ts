import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const supabase = createAuthedRouteHandlerClient(request);
  const url = new URL(request.url);
  const profileId = url.searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('get_comedy_specials', { p_profile_id: profileId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
}

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
  const id = typeof body?.id === 'string' ? body.id : null;
  const payload = body && typeof body === 'object' && body.payload && typeof body.payload === 'object' ? body.payload : null;

  if (!payload) {
    return NextResponse.json({ error: 'payload is required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('upsert_comedy_special', {
    p_id: id,
    p_payload: payload,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data ?? null, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const supabase = createAuthedRouteHandlerClient(request);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : null;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase.rpc('delete_comedy_special', { p_id: id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
