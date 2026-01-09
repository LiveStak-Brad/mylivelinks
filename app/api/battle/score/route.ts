/**
 * Battle Score API - Process gift → battle points conversion
 * 
 * Called by gift processing to award battle points when a gift is sent
 * during an active battle session.
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
    const {
      session_id,
      recipient_id,
      sender_id,
      sender_username,
      sender_display_name,
      sender_avatar_url,
      coin_amount,
    } = body;
    
    if (!session_id || !recipient_id || !sender_id || !coin_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get session to determine which side the recipient is on
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('host_a, host_b, status, type')
      .eq('id', session_id)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Only award points for active battle sessions
    if (session.type !== 'battle' || session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not an active battle' },
        { status: 400 }
      );
    }
    
    // Determine which side the recipient is on
    let side: 'A' | 'B';
    if (recipient_id === session.host_a) {
      side = 'A';
    } else if (recipient_id === session.host_b) {
      side = 'B';
    } else {
      return NextResponse.json(
        { error: 'Recipient is not a participant in this battle' },
        { status: 400 }
      );
    }
    
    // Get current boost state to apply multiplier
    const { data: scoreData, error: scoreError } = await supabase
      .from('battle_scores')
      .select('boost_active, boost_multiplier')
      .eq('session_id', session_id)
      .single();
    
    const boostMultiplier = scoreData?.boost_active 
      ? (scoreData.boost_multiplier || 1) 
      : 1;
    
    // Calculate battle points (coins × boost multiplier)
    const battlePoints = Math.floor(coin_amount * boostMultiplier);
    
    // Apply score update via RPC
    const { data: updatedScores, error: applyError } = await supabase.rpc(
      'rpc_battle_score_apply',
      {
        p_session_id: session_id,
        p_side: side,
        p_points_delta: battlePoints,
        p_supporter: {
          profile_id: sender_id,
          username: sender_username || 'Unknown',
          display_name: sender_display_name,
          avatar_url: sender_avatar_url,
          side,
          points_delta: battlePoints,
          chat_award: false,
        },
      }
    );
    
    if (applyError) {
      console.error('[battle/score] RPC error:', applyError);
      return NextResponse.json(
        { error: 'Failed to update battle scores' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      side,
      points_awarded: battlePoints,
      boost_applied: boostMultiplier > 1,
      boost_multiplier: boostMultiplier,
      scores: updatedScores,
    });
  } catch (err: any) {
    console.error('[battle/score] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
