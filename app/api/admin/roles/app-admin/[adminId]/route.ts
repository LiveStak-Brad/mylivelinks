import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireOwner } from '@/lib/rbac';

// DELETE /api/admin/roles/app-admin/[adminId] - Remove an app admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { adminId: string } }
) {
  try {
    await requireOwner(request);
    const supabase = createRouteHandlerClient(request);

    const { adminId } = params;

    const { error } = await supabase.rpc('revoke_app_admin', {
      p_target_profile_id: adminId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /admin/roles/app-admin/[adminId]] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

