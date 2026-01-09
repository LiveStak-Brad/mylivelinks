import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { isOwnerProfile } from '@/lib/owner-ids';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
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

    // Use admin client to fetch all applications
    const adminSupabase = getSupabaseAdmin();
    const { data: applications, error } = await adminSupabase
      .from('mll_pro_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[owner/mll-pro/applications] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    return NextResponse.json({ applications });

  } catch (error) {
    console.error('[owner/mll-pro/applications] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
