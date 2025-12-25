import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Stream Cleanup API
 * Called via sendBeacon when user closes tab or navigates away while streaming
 * This ensures streams are properly ended even on sudden page closure
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profile_id, action } = body;

    if (!profile_id || action !== 'end_stream') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Create Supabase client with service role for cleanup operations
    const supabase = createRouteHandlerClient({ cookies });

    console.log('[STREAM-CLEANUP] Ending stream for profile:', profile_id);

    // Update live_streams table
    const { error: updateError } = await supabase
      .from('live_streams')
      .update({ 
        live_available: false, 
        ended_at: new Date().toISOString() 
      })
      .eq('profile_id', profile_id);

    if (updateError) {
      console.error('[STREAM-CLEANUP] Error updating live_streams:', updateError);
    }

    // Remove from user_grid_slots
    const { error: deleteError } = await supabase
      .from('user_grid_slots')
      .delete()
      .eq('streamer_id', profile_id);

    if (deleteError) {
      console.error('[STREAM-CLEANUP] Error deleting grid slots:', deleteError);
    }

    // Remove from room_presence if exists
    const { error: presenceError } = await supabase
      .from('room_presence')
      .delete()
      .eq('user_id', profile_id);

    if (presenceError) {
      console.error('[STREAM-CLEANUP] Error removing room presence:', presenceError);
    }

    console.log('[STREAM-CLEANUP] Successfully cleaned up stream for:', profile_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[STREAM-CLEANUP] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle preflight for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

