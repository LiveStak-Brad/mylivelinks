import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

/**
 * GET /api/admin/feature-flags
 * Returns all feature flags (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all feature flags
    const { data: flags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('*')
      .order('key');

    if (flagsError) {
      console.error('Error fetching feature flags:', flagsError);
      return NextResponse.json(
        { error: 'Failed to fetch feature flags' },
        { status: 500 }
      );
    }

    return NextResponse.json({ flags });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/feature-flags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/feature-flags
 * Updates a feature flag (admin only)
 * Body: { key: string, enabled: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { key, enabled } = body;

    // Validate input
    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'Invalid key parameter' },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid enabled parameter (must be boolean)' },
        { status: 400 }
      );
    }

    // Get IP and User-Agent for audit log
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update feature flag using the stored function (which handles audit logging)
    const { data: updatedFlag, error: updateError } = await supabase
      .rpc('update_feature_flag', {
        p_key: key,
        p_enabled: enabled,
        p_changed_by: user.id,
        p_ip_address: ip,
        p_user_agent: userAgent
      });

    if (updateError) {
      console.error('Error updating feature flag:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update feature flag' },
        { status: 500 }
      );
    }

    // Fetch the updated flag to return complete data
    const { data: flag, error: fetchError } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('key', key)
      .single();

    if (fetchError) {
      console.error('Error fetching updated flag:', fetchError);
      // Still return success since the update worked
      return NextResponse.json({ 
        success: true,
        message: 'Feature flag updated successfully',
        flag: { key, enabled }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Feature flag updated successfully',
      flag
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/feature-flags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


