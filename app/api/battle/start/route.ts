/**
 * Battle Start API - Convert cohost session to battle
 * 
 * Called when a host in a cohost session wants to start a battle.
 * Creates a battle invite that the other host must accept.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { session_id, mode = 'standard' } = body;
    
    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }
    
    // Get current cohost session
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', session_id)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Verify user is a participant
    if (session.host_a !== user.id && session.host_b !== user.id) {
      return NextResponse.json(
        { error: 'You are not a participant in this session' },
        { status: 403 }
      );
    }
    
    // Verify session is a cohost session
    if (session.type !== 'cohost') {
      return NextResponse.json(
        { error: 'Session is not a cohost session' },
        { status: 400 }
      );
    }
    
    // Determine who to send invite to
    const to_host_id = session.host_a === user.id ? session.host_b : session.host_a;
    
    // Create battle invite
    const { data: invite, error: inviteError } = await supabase
      .from('live_session_invites')
      .insert({
        from_host_id: user.id,
        to_host_id,
        type: 'battle',
        mode,
        session_id, // Link to existing cohost session for context
      })
      .select()
      .single();
    
    if (inviteError) {
      console.error('[battle/start] Invite creation error:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create battle invite' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      invite_id: invite.id,
      message: 'Battle invite sent. Waiting for other host to accept.',
    });
  } catch (err: any) {
    console.error('[battle/start] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
