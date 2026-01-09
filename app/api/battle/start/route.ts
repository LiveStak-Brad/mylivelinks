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
    const { session_id } = body;
    
    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }
    
    // Convert cohost session to battle using RPC
    const { data, error: rpcError } = await supabase.rpc(
      'rpc_start_battle_from_cohost',
      { p_session_id: session_id }
    );
    
    if (rpcError) {
      console.error('[battle/start] RPC error:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to start battle' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      session_id: data.session_id,
      type: data.type,
      started_at: data.started_at,
      ends_at: data.ends_at,
      message: 'Battle started!',
    });
  } catch (err: any) {
    console.error('[battle/start] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
