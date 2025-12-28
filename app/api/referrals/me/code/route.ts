import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/rbac';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);

    const supabase = createRouteHandlerClient(request);
    const { data, error } = await supabase.rpc('get_or_create_referral_code');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const row = Array.isArray(data) ? data[0] : data;
    const code = typeof row?.code === 'string' ? row.code : null;
    const url = typeof row?.url === 'string' ? row.url : null;

    if (!code || !url) {
      return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 });
    }

    return NextResponse.json({ code, url }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Failed to load referral code' }, { status: 500 });
  }
}
