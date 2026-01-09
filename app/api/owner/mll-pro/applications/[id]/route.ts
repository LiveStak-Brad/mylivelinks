import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { isOwnerProfile } from '@/lib/owner-ids';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
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

    const adminSupabase = getSupabaseAdmin();
    const { data: application, error } = await adminSupabase
      .from('mll_pro_applications')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('[owner/mll-pro/applications/:id] Fetch error:', error);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });

  } catch (error) {
    console.error('[owner/mll-pro/applications/:id] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
