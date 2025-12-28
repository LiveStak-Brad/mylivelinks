import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/rbac';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const authedUser = await requireUser(request);

    const origin = new URL(request.url).origin;

    const supabase = createRouteHandlerClient(request);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    let username: string | null = null;
    if (userId) {
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();
      const uname = typeof (profile as any)?.username === 'string' ? String((profile as any).username).trim() : '';
      if (uname) username = uname;
    }

    const { data, error } = await supabase.rpc('get_or_create_referral_code');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const row = Array.isArray(data) ? data[0] : data;
    const code = typeof row?.code === 'string' ? row.code : null;
    const url = username
      ? `${origin}/invite/${encodeURIComponent(username)}`
      : code
        ? `${origin}/join?ref=${encodeURIComponent(code)}`
        : null;

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
