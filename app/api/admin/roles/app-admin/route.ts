import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// POST /api/admin/roles/app-admin - Add a new app admin
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // TODO: Implement actual role assignment in database
    // For now, just return success
    console.log(`[Roles] Adding app admin: ${user_id}`);

    return NextResponse.json({ success: true, message: 'App admin added (stub)' });
  } catch (err) {
    console.error('[API /admin/roles/app-admin] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

