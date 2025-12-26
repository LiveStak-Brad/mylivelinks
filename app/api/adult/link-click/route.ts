import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/adult/link-click
 * Log adult link click for audit trail
 * Body: { linkId: number }
 * 
 * SAFETY: 
 * - Verifies user eligibility server-side
 * - Logs to audit trail
 * - Hashes IP for privacy
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
    const { linkId } = body;
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Missing linkId' },
        { status: 400 }
      );
    }
    
    // Get IP and user agent for audit
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Hash IP for privacy (one-way hash, can't reverse to actual IP)
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    
    // Call RPC to log click (includes eligibility check)
    const { error } = await supabase.rpc('log_adult_link_click', {
      p_profile_id: user.id,
      p_link_id: linkId,
      p_platform: 'web',
      p_ip_hash: ipHash,
      p_user_agent: userAgent
    });
    
    if (error) {
      console.error('Adult link click logging error:', error);
      // Don't fail the request if logging fails
      // User can still proceed to link
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    console.error('Adult link click API error:', error);
    // Don't fail - let user proceed even if logging fails
    return NextResponse.json({ success: true }, { status: 200 });
  }
}




