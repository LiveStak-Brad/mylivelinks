/**
 * Battle Boost API - Trigger boost rounds
 * 
 * Called to activate a boost round during an active battle.
 * Boost multiplies battle points for a limited time.
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
    const { session_id, multiplier = 2, duration_seconds = 30 } = body;
    
    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }
    
    // Get session to verify it's an active battle
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('type, status')
      .eq('id', session_id)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    if (session.type !== 'battle' || session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not an active battle' },
        { status: 400 }
      );
    }
    
    // Calculate boost timestamps
    const now = new Date();
    const endsAt = new Date(now.getTime() + duration_seconds * 1000);
    
    // Apply boost via RPC
    const { data: updatedScores, error: applyError } = await supabase.rpc(
      'rpc_battle_score_apply',
      {
        p_session_id: session_id,
        p_side: 'A', // Doesn't matter, we're just updating boost state
        p_points_delta: 0,
        p_boost: {
          active: true,
          multiplier,
          started_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
        },
      }
    );
    
    if (applyError) {
      console.error('[battle/boost] RPC error:', applyError);
      return NextResponse.json(
        { error: 'Failed to activate boost' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      boost: {
        active: true,
        multiplier,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[battle/boost] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Deactivate boost
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');
    
    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }
    
    // Deactivate boost
    const { data: updatedScores, error: applyError } = await supabase.rpc(
      'rpc_battle_score_apply',
      {
        p_session_id: session_id,
        p_side: 'A',
        p_points_delta: 0,
        p_boost: {
          active: false,
          multiplier: 1,
          started_at: null,
          ends_at: null,
        },
      }
    );
    
    if (applyError) {
      console.error('[battle/boost] Deactivate error:', applyError);
      return NextResponse.json(
        { error: 'Failed to deactivate boost' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      boost: {
        active: false,
        multiplier: 1,
      },
    });
  } catch (err: any) {
    console.error('[battle/boost] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
