import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/adult/consent
 * Accept adult content disclaimer (web only, 18+ only)
 * 
 * SAFETY: Server validates age and platform before accepting consent
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get platform from headers or body
    const body = await request.json();
    const platform = body.platform || 'web';
    
    // SAFETY RULE: Never allow consent from mobile
    if (platform !== 'web') {
      return NextResponse.json(
        { error: 'Adult content not available on mobile' },
        { status: 403 }
      );
    }
    
    // Call RPC to accept disclaimer (includes age verification)
    const { data, error } = await supabase.rpc('accept_adult_disclaimer', {
      p_profile_id: user.id
    });
    
    if (error) {
      console.error('Adult consent error:', error);
      return NextResponse.json(
        { error: 'Failed to accept disclaimer' },
        { status: 500 }
      );
    }
    
    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || 'Must be 18 or older' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      expires_at: data.expires_at
    }, { status: 200 });
    
  } catch (error) {
    console.error('Consent API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/adult/consent
 * Check if user has active adult consent
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        has_consent: false,
        is_authenticated: false
      }, { status: 200 });
    }
    
    // Check eligibility
    const { data: eligible, error } = await supabase.rpc('is_eligible_for_adult_content', {
      p_profile_id: user.id,
      p_platform: 'web'
    });
    
    if (error) {
      console.error('Eligibility check error:', error);
      return NextResponse.json({
        has_consent: false,
        is_authenticated: true
      }, { status: 200 });
    }
    
    // Get consent details
    const { data: settings } = await supabase
      .from('user_settings')
      .select('has_accepted_adult_disclaimer, adult_disclaimer_expires_at')
      .eq('profile_id', user.id)
      .single();
    
    return NextResponse.json({
      has_consent: eligible === true,
      is_authenticated: true,
      expires_at: settings?.adult_disclaimer_expires_at
    }, { status: 200 });
    
  } catch (error) {
    console.error('Consent check API error:', error);
    return NextResponse.json({
      has_consent: false,
      is_authenticated: false
    }, { status: 200 });
  }
}








