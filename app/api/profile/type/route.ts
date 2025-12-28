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
  const type = typeof body?.type === 'string' ? body.type : null;

  if (!type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('set_profile_type', { p_type: type });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile_type: String(data) }, { status: 200 });
}
