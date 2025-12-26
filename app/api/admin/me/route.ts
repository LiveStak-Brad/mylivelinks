import { NextRequest, NextResponse } from 'next/server';
import { getViewerContext } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getViewerContext(request);

    return NextResponse.json(
      {
        is_owner: ctx.is_owner,
        is_app_admin: ctx.is_app_admin,
        room_roles: ctx.room_roles,
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[API /admin/me] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
