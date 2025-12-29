import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/rbac';

// POST /api/admin/roles/app-admin - Add a new app admin
export async function POST(request: NextRequest) {
  try {
    await requireOwner(request);
    const supabase = createRouteHandlerClient(request);

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { error } = await supabase.rpc('grant_app_admin', {
      p_target_profile_id: user_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/roles/app-admin] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

