import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { isOwnerProfile } from '@/lib/owner-ids';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated and is owner
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is owner using hardcoded owner IDs
    if (!isOwnerProfile(user.id)) {
      return NextResponse.json({ error: 'Forbidden - Owner access required' }, { status: 403 });
    }

    const body = await req.json();
    const { profileId, isMllPro } = body;

    if (!profileId || typeof isMllPro !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Update the is_mll_pro flag
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_mll_pro: isMllPro })
      .eq('id', profileId);

    if (updateError) {
      console.error('[toggle-mll-pro] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update PRO badge' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profileId, 
      isMllPro 
    });

  } catch (error) {
    console.error('[toggle-mll-pro] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
