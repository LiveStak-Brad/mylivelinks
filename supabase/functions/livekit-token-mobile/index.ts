/**
 * Supabase Edge Function: livekit-token-mobile
 * 
 * Mobile-safe LiveKit token endpoint.
 * Requires Supabase JWT auth. No CORS restrictions (mobile clients).
 * 
 * Required Supabase Secrets:
 * - LIVEKIT_URL
 * - LIVEKIT_API_KEY  
 * - LIVEKIT_API_SECRET
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2.6.1';

const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL')?.trim() || '';
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY')?.trim() || '';
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET')?.trim() || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

interface TokenRequest {
  roomName: string;
  identity: string;
  name?: string;
  isHost?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify auth - get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.slice('Bearer '.length);

    // Create Supabase client and verify the user
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', detail: authError?.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: TokenRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { roomName, identity, name, isHost } = body;

    if (!roomName || !identity) {
      return new Response(JSON.stringify({ error: 'roomName and identity are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate room name format - allow solo_* rooms for mobile
    const isSoloRoom = /^solo_[a-f0-9-]+$/i.test(roomName);
    const isLiveCentralRoom = roomName === 'live_central' || roomName === 'live-central';
    
    if (!isSoloRoom && !isLiveCentralRoom) {
      return new Response(JSON.stringify({ error: 'Invalid room name format' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify LiveKit config
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('[livekit-token-mobile] Missing LiveKit configuration');
      return new Response(JSON.stringify({ error: 'LiveKit configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate LiveKit token with device-scoped identity
    // Format: u_<userId>:mobile:<deviceId>:<sessionId>
    const deviceId = 'mobile_' + Date.now().toString().slice(-6); // Simple device ID for mobile
    const sessionId = Date.now().toString();
    const participantIdentity = `u_${user.id}:mobile:${deviceId}:${sessionId}`;
    const participantName = name || user.email?.split('@')[0] || 'User';

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      ttl: '2h', // 2 hour token for mobile sessions
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isHost === true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    // Add metadata
    at.metadata = JSON.stringify({
      userId: user.id,
      isHost: isHost === true,
      platform: 'mobile',
    });

    const token = await at.toJwt();

    // Ensure WebSocket URL format
    let wsUrl = LIVEKIT_URL;
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
      wsUrl = `wss://${wsUrl}`;
    }

    console.log('[livekit-token-mobile] Token generated', {
      userId: user.id,
      roomName,
      identity: participantIdentity,
      canPublish: isHost === true,
    });

    return new Response(JSON.stringify({
      token,
      url: wsUrl,
      identity: participantIdentity,
      roomName,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('[livekit-token-mobile] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
