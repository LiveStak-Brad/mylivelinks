import { createRouteHandlerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/reports/create
 * Create a content report (user, stream, profile, chat)
 * Body: {
 *   report_type: 'user' | 'stream' | 'profile' | 'chat',
 *   reported_user_id?: string,
 *   report_reason: string,
 *   report_details?: string,
 *   context_details?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const {
      report_type,
      reported_user_id,
      report_reason,
      report_details,
      context_details,
    } = body;
    
    // Validate required fields
    if (!report_type || !report_reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: report_type and report_reason' },
        { status: 400 }
      );
    }
    
    // Validate report_type
    const validReportTypes = ['user', 'stream', 'profile', 'chat'];
    if (!validReportTypes.includes(report_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report_type. Must be: user, stream, profile, or chat' },
        { status: 400 }
      );
    }
    
    // Check rate limit (10 reports per hour per user)
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc(
      'check_report_rate_limit',
      { p_reporter_id: user.id }
    );
    
    if (rateLimitError) {
      console.error('[REPORT] Rate limit check error:', rateLimitError);
      // Continue anyway if rate limit check fails (don't block legitimate reports)
    } else if (rateLimitOk === false) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. You can submit up to 10 reports per hour.' },
        { status: 429 }
      );
    }
    
    // Prevent self-reporting
    if (reported_user_id && reported_user_id === user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot report yourself' },
        { status: 400 }
      );
    }
    
    // Insert report
    const { data: report, error: insertError } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reported_user_id || null,
        report_type,
        report_reason,
        report_details: report_details || null,
        context_details: context_details || null,
        status: 'pending',
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[REPORT] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: `Failed to submit report: ${insertError.message}` },
        { status: 500 }
      );
    }
    
    console.log('[REPORT] Report created:', {
      report_id: report.id,
      reporter_id: user.id,
      report_type,
      report_reason,
    });
    
    // TODO: Send notification to admin/moderation team
    // This could be an email, Slack notification, or database trigger
    
    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
      report_id: report.id,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[REPORT] Exception:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}





