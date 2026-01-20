/**
 * Battle Accept API - Accept battle invite from cohost session
 * 
 * Called when a host accepts a battle invite sent during a cohost session.
 * Converts the cohost session to an active battle.
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
    const { invite_id } = body;
    
    if (!invite_id) {
      return NextResponse.json(
        { error: 'Missing invite_id' },
        { status: 400 }
      );
    }
    
    // Accept the battle invite and convert session
    const { data, error: rpcError } = await supabase.rpc(
      'rpc_accept_battle_invite_from_cohost',
      { p_invite_id: invite_id }
    );
    
    if (rpcError) {
      console.error('[battle/accept] RPC error:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to accept battle invite' },
        { status: 500 }
      );
    }
    
    console.log('[battle/accept] Success:', data);
    
    // Handle both "battle_started" and "accepted_waiting" statuses
    return NextResponse.json({
      success: true,
      status: data?.status || 'accepted',
      session_id: data?.session_id,
      type: data?.type,
      started_at: data?.started_at,
      ends_at: data?.ends_at,
      pending_count: data?.pending_count,
      message: data?.status === 'battle_started' ? 'Battle started!' : 'Waiting for others...',
    });
  } catch (err: any) {
    console.error('[battle/accept] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
