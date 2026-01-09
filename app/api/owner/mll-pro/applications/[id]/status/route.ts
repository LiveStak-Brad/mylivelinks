import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { isOwnerProfile } from '@/lib/owner-ids';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient(req);
    
    // Check if user is authenticated and is owner
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOwnerProfile(user.id)) {
      return NextResponse.json({ error: 'Forbidden - Owner access required' }, { status: 403 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !['submitted', 'reviewing', 'approved', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();
    const { data, error } = await adminSupabase
      .from('mll_pro_applications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[owner/mll-pro/applications/:id/status] Update error:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, application: data });

  } catch (error) {
    console.error('[owner/mll-pro/applications/:id/status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
