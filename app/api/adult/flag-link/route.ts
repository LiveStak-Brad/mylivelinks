import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/adult/flag-link
 * Report an adult link for review
 * Body: { linkId: number, reason: string }
 * 
 * SAFETY: Allows users to report miscategorized or inappropriate links
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { linkId, reason } = body;
    
    if (!linkId || !reason) {
      return NextResponse.json(
        { error: 'Missing linkId or reason' },
        { status: 400 }
      );
    }
    
    // Validate reason length
    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'Reason too long (max 500 characters)' },
        { status: 400 }
      );
    }
    
    // Flag the link (requires admin review)
    const { error: updateError } = await supabase
      .from('user_links')
      .update({
        is_flagged: true,
        flagged_reason: reason,
        flagged_at: new Date().toISOString()
      })
      .eq('id', linkId);
    
    if (updateError) {
      console.error('Link flag error:', updateError);
      return NextResponse.json(
        { error: 'Failed to flag link' },
        { status: 500 }
      );
    }
    
    // Audit log
    try {
      await supabase
        .from('audit_logs')
        .insert({
          profile_id: user.id,
          action: 'adult_link_flagged',
          target_type: 'user_link',
          target_id: linkId,
          metadata: { reason },
        });
    } catch {
      // Non-critical if audit log fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Link flagged for review'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Flag link API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}







