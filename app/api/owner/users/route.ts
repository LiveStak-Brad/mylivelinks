import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const q = (url.searchParams.get('q') || '').trim();

    const admin = getSupabaseAdmin();

    const applySearch = (query: any) => {
      if (q) {
        const escaped = q.replace(/,/g, '');
        return query.or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`);
      }
      return query;
    };

    const queryWithLiveAccess = applySearch(
      admin
        .from('profiles')
        .select('*, live_access_grants(profile_id)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    const { data: data1, error: err1 } = await queryWithLiveAccess;

    if (!err1) {
      return NextResponse.json({ users: data1 ?? [], limit, offset });
    }

    const msg = String(err1.message || '').toLowerCase();
    const canFallback = msg.includes('live_access_grants') || msg.includes('relationship') || msg.includes('schema cache');
    if (!canFallback) {
      return NextResponse.json({ error: err1.message }, { status: 500 });
    }

    const queryFallback = applySearch(
      admin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    const { data: data2, error: err2 } = await queryFallback;
    if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });

    return NextResponse.json({ users: data2 ?? [], limit, offset });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
