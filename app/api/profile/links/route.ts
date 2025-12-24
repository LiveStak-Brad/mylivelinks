import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/profile/links
 * Create or update user links
 * Body: { links: Array<{ id?, title, url, icon?, display_order, is_active }> }
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
    const { links } = body;
    
    if (!Array.isArray(links)) {
      return NextResponse.json(
        { error: 'Links must be an array' },
        { status: 400 }
      );
    }
    
    const results = [];
    
    for (const link of links) {
      if (link.id) {
        // Update existing link
        const { data, error } = await supabase
          .from('user_links')
          .update({
            title: link.title,
            url: link.url,
            icon: link.icon || null,
            display_order: link.display_order,
            is_active: link.is_active !== false,
            updated_at: new Date().toISOString()
          })
          .eq('id', link.id)
          .eq('profile_id', user.id) // Security: only update own links
          .select()
          .single();
        
        if (error) {
          console.error('Link update error:', error);
          continue;
        }
        
        results.push(data);
      } else {
        // Create new link
        const { data, error } = await supabase
          .from('user_links')
          .insert({
            profile_id: user.id,
            title: link.title,
            url: link.url,
            icon: link.icon || null,
            display_order: link.display_order || 0,
            is_active: link.is_active !== false
          })
          .select()
          .single();
        
        if (error) {
          console.error('Link create error:', error);
          continue;
        }
        
        results.push(data);
      }
    }
    
    return NextResponse.json({ success: true, links: results }, { status: 200 });
  } catch (error) {
    console.error('Links API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/links?linkId=xxx
 * Delete a user link (owner only)
 */
export async function DELETE(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Missing linkId' },
        { status: 400 }
      );
    }
    
    // Delete link (only if owner)
    const { error } = await supabase
      .from('user_links')
      .delete()
      .eq('id', linkId)
      .eq('profile_id', user.id); // Security: only delete own links
    
    if (error) {
      console.error('Link delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete link' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete link API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

