import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/profile/customize
 * Update profile customization settings (owner only)
 * Body: customization fields from profiles table
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
    
    const body = await request.json();
    
    // Allowed customization fields
    const allowedFields = [
      'profile_bg_url',
      'profile_bg_overlay',
      'card_color',
      'card_opacity',
      'card_border_radius',
      'font_preset',
      'accent_color',
      'links_section_title'
    ];
    
    // Filter to only allowed fields
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid customization fields provided' },
        { status: 400 }
      );
    }
    
    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Customization update error:', error);
      return NextResponse.json(
        { error: 'Failed to update customization' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, profile: data }, { status: 200 });
  } catch (error) {
    console.error('Customize API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

