import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/profile/link-click
 * Track link click (analytics)
 * Body: { linkId: number }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const body = await request.json();
    const { linkId } = body;
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Missing linkId' },
        { status: 400 }
      );
    }
    
    // Call RPC function to track click
    const { error } = await supabase.rpc('track_link_click', {
      p_link_id: linkId
    });
    
    if (error) {
      console.error('Link click tracking error:', error);
      // Don't fail the request if tracking fails
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Link click API error:', error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

