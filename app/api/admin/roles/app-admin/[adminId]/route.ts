import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

// DELETE /api/admin/roles/app-admin/[adminId] - Remove an app admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { adminId: string } }
) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adminId } = params;

    // TODO: Implement actual role removal in database
    console.log(`[Roles] Removing app admin: ${adminId}`);

    return NextResponse.json({ success: true, message: 'App admin removed (stub)' });
  } catch (err) {
    console.error('[API /admin/roles/app-admin/[adminId]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

