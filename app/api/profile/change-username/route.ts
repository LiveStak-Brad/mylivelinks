import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/profile/change-username
 * Change user's username with validation
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { newUsername } = body;
    
    if (!newUsername) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    // Call RPC function to change username
    const { data, error } = await supabase.rpc('change_username', {
      p_profile_id: user.id,
      p_new_username: newUsername.trim()
    });
    
    if (error) {
      console.error('Username change error:', error);
      return NextResponse.json(
        { error: 'Failed to change username' },
        { status: 500 }
      );
    }
    
    if (!data.success) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: data.message,
      newUsername: data.new_username
    }, { status: 200 });
    
  } catch (error) {
    console.error('Change username API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/change-username?username=desired&currentUserId=uuid
 * Check if username is available
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const currentUserId = searchParams.get('currentUserId');
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }
    
    // Call RPC function to check availability
    const { data, error } = await supabase.rpc('check_username_availability', {
      p_username: username.trim(),
      p_current_user_id: currentUserId || null
    });
    
    if (error) {
      console.error('Username check error:', error);
      return NextResponse.json(
        { error: 'Failed to check username' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data, { status: 200 });
    
  } catch (error) {
    console.error('Check username API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

