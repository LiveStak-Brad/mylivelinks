import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { canAccessLive } from '@/lib/livekit-constants';

// Trim whitespace from environment variables to prevent issues
const LIVEKIT_URL = process.env.LIVEKIT_URL?.trim();
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY?.trim();
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET?.trim();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// CORS headers for mobile app requests
// TODO: Tighten CORS allowlist for production (restrict to specific mobile app domains/origins)
// Current: Allow all origins for initial mobile build compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins (can restrict to specific domains if needed)
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables with detailed error messages
    if (!LIVEKIT_URL) {
      console.error('LIVEKIT_URL is not set in environment variables');
      return NextResponse.json(
        { error: 'LiveKit URL not configured. Please set LIVEKIT_URL in Vercel environment variables.' },
        { status: 500 }
      );
    }
    if (!LIVEKIT_API_KEY) {
      console.error('LIVEKIT_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'LiveKit API Key not configured. Please set LIVEKIT_API_KEY in Vercel environment variables.' },
        { status: 500 }
      );
    }
    if (!LIVEKIT_API_SECRET) {
      console.error('LIVEKIT_API_SECRET is not set in environment variables');
      return NextResponse.json(
        { error: 'LiveKit API Secret not configured. Please set LIVEKIT_API_SECRET in Vercel environment variables.' },
        { status: 500 }
      );
    }

    // Log credential status (without exposing secrets)
    console.log('LiveKit credentials check:', {
      hasUrl: !!LIVEKIT_URL,
      urlFormat: LIVEKIT_URL?.substring(0, 50) + '...',
      urlFull: LIVEKIT_URL, // Log full URL to verify it matches
      hasApiKey: !!LIVEKIT_API_KEY,
      apiKeyLength: LIVEKIT_API_KEY?.length,
      apiKeyPrefix: LIVEKIT_API_KEY?.substring(0, 15) + '...', // First 15 chars to verify
      hasApiSecret: !!LIVEKIT_API_SECRET,
      apiSecretLength: LIVEKIT_API_SECRET?.length,
      apiSecretPrefix: LIVEKIT_API_SECRET?.substring(0, 15) + '...', // First 15 chars to verify
    });

    // Create Supabase client with proper route handler support
    let supabase = createRouteHandlerClient(request);

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    // TEMP: Confirm which Supabase project this deployment is using (no secrets)
    console.log('[TOKEN_API] supabase_project_ref', {
      ref: SUPABASE_URL?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? null,
    });

    // TEMP: Prove server received an Authorization header (do not log token)
    console.log('[TOKEN_API] auth_header_presence', {
      hasAuthHeader: !!authHeader,
      isBearer: !!bearerToken,
    });

    // Get authenticated user (supports cookie auth for web and Bearer token auth for mobile)
    let user: any = null;
    let authError: any = null;

    if (bearerToken) {
      const admin = getSupabaseAdmin();
      const result = await (admin.auth as any).getUser(bearerToken);
      user = result?.data?.user || null;
      authError = result?.error || null;
      supabase = admin as any;
    } else {
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
      authError = result.error || null;
    }

    console.log('Auth result:', {
      hasUser: !!user,
      userId: user?.id?.substring(0, 8) + '...',
      error: authError?.message,
    });

    if (authError || !user) {
      console.error('[TOKEN_API] Authentication failed:', {
        hasAuthHeader: !!authHeader,
        usedBearer: !!bearerToken,
        errorMessage: authError?.message,
      });
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!canAccessLive({ id: user.id, email: user.email })) {
      return NextResponse.json(
        { error: 'Live is not available yet' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get request body
    const body = await request.json();
    const { 
      roomName, 
      participantName, 
      participantMetadata, 
      canPublish, 
      canSubscribe, 
      userId: clientUserId,
      deviceType,
      deviceId,
      sessionId,
      role,
    } = body;

    // TEMP DEBUG: Parity proof logging (do not change response shape)
    // Helps confirm which host minted the token, the requested room, and the wsUrl used by clients.
    console.log('[PARITY-PROOF][TOKEN_API] request_headers', {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
      'cf-ray': request.headers.get('cf-ray'),
      'user-agent': request.headers.get('user-agent'),
    });

    // Validate required fields
    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'roomName and participantName are required' },
        { status: 400 }
      );
    }

    // Validate device-scoped identity fields (strongly recommended)
    if (!deviceType || !deviceId || !sessionId) {
      console.warn('Missing device-scoped identity fields:', { deviceType, deviceId, sessionId });
    }

    // Get user's profile for metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Create LiveKit access token with device-scoped identity
    // Format: u_<userId>:<deviceType>:<deviceId>:<sessionId>
    // This allows same user on multiple devices without collision
    const userId = String(user.id);
    const effectiveDeviceType = deviceType || 'web';
    const effectiveDeviceId = deviceId || 'unknown';
    const effectiveSessionId = sessionId || Date.now().toString();
    
    // Build device-scoped identity (DO NOT use displayName in identity)
    const identity = `u_${userId}:${effectiveDeviceType}:${effectiveDeviceId}:${effectiveSessionId}`;
    
    // Display name for UI (separate from identity)
    const name = participantName || profile?.display_name || profile?.username || user.email || 'Anonymous';
    const effectiveRole = role || (canPublish ? 'publisher' : 'viewer');
    
    const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
    
    if (DEBUG_LIVEKIT) {
      console.log('[TOKEN] room=' + roomName + 
                  ' user=' + userId + 
                  ' deviceType=' + effectiveDeviceType + 
                  ' deviceId=' + effectiveDeviceId.substring(0, 8) + '...' +
                  ' sessionId=' + effectiveSessionId.substring(0, 8) + '...' +
                  ' identity=' + identity + 
                  ' role=' + effectiveRole);
    }
    
    console.log('Generating LiveKit token:', {
      identity,
      name,
      roomName,
      canPublish,
      canSubscribe,
      deviceType: effectiveDeviceType,
      role: effectiveRole,
    });

    // Validate API key/secret format (they should be strings)
    // Check for common issues: whitespace, newlines, quotes
    const apiKeyClean = LIVEKIT_API_KEY?.replace(/[\r\n\t\s"']/g, '');
    const apiSecretClean = LIVEKIT_API_SECRET?.replace(/[\r\n\t\s"']/g, '');
    
    if (typeof LIVEKIT_API_KEY !== 'string' || LIVEKIT_API_KEY.length < 10) {
      console.error('Invalid LIVEKIT_API_KEY format:', {
        type: typeof LIVEKIT_API_KEY,
        length: LIVEKIT_API_KEY?.length,
        hasWhitespace: LIVEKIT_API_KEY !== apiKeyClean,
      });
      return NextResponse.json(
        { error: 'Invalid LiveKit API Key format. Please check your Vercel environment variables.' },
        { status: 500 }
      );
    }
    if (typeof LIVEKIT_API_SECRET !== 'string' || LIVEKIT_API_SECRET.length < 10) {
      console.error('Invalid LIVEKIT_API_SECRET format:', {
        type: typeof LIVEKIT_API_SECRET,
        length: LIVEKIT_API_SECRET?.length,
        hasWhitespace: LIVEKIT_API_SECRET !== apiSecretClean,
      });
      return NextResponse.json(
        { error: 'Invalid LiveKit API Secret format. Please check your Vercel environment variables.' },
        { status: 500 }
      );
    }
    
    // Use cleaned versions if there were whitespace issues
    const finalApiKey = apiKeyClean || LIVEKIT_API_KEY;
    const finalApiSecret = apiSecretClean || LIVEKIT_API_SECRET;
    
    if (finalApiKey !== LIVEKIT_API_KEY || finalApiSecret !== LIVEKIT_API_SECRET) {
      console.warn('Whitespace detected in LiveKit credentials - using cleaned versions');
    }

    let at: AccessToken;
    try {
      // Create token with 6 hour expiration - use cleaned credentials
      at = new AccessToken(finalApiKey, finalApiSecret, {
        identity: identity,
        name: name,
        ttl: '6h', // 6 hours expiration
      });
      
      console.log('AccessToken created with:', {
        apiKeyPrefix: finalApiKey.substring(0, 15) + '...',
        apiKeyLength: finalApiKey.length,
        apiSecretLength: finalApiSecret.length,
        identity,
        name,
        roomName,
      });
    } catch (tokenErr: any) {
      console.error('Error creating AccessToken:', {
        error: tokenErr.message,
        stack: tokenErr.stack,
        apiKeyPrefix: finalApiKey.substring(0, 15) + '...',
        apiKeyLength: finalApiKey.length,
      });
      return NextResponse.json(
        { error: `Failed to create LiveKit token: ${tokenErr.message || 'Invalid API credentials'}` },
        { status: 500 }
      );
    }

    // Grant permissions
    // CRITICAL: Respect explicit canPublish/canSubscribe from request
    // Default to false for security (require explicit opt-in)
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: canPublish === true, // Explicit true required for publishing
      canSubscribe: canSubscribe !== false, // Default to true (viewing is safe)
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    // Add metadata
    if (participantMetadata) {
      at.metadata = JSON.stringify(participantMetadata);
    } else if (profile) {
      at.metadata = JSON.stringify({
        profile_id: user.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      });
    }

    // Generate token - toJwt() returns a Promise<string> in this SDK version
    let token: string;
    try {
      token = await at.toJwt();
    } catch (jwtErr: any) {
      console.error('Error generating JWT:', jwtErr);
      return NextResponse.json(
        { error: `Failed to generate token: ${jwtErr.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    // Validate token was generated
    if (!token || typeof token !== 'string' || token.length < 50) {
      console.error('Token generation failed - token too short or invalid:', { 
        tokenType: typeof token,
        tokenLength: typeof token === 'string' ? token.length : 'N/A' 
      });
      return NextResponse.json(
        { error: 'Failed to generate valid token' },
        { status: 500 }
      );
    }

    // Decode token to verify structure (first part is header, second is payload)
    let tokenPayload: any = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        tokenPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      }
    } catch (decodeErr) {
      console.warn('Could not decode token payload:', decodeErr);
    }
    
    console.log('Token generated successfully for:', { 
      identity, 
      name, 
      roomName,
      url: LIVEKIT_URL,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 30) + '...',
      apiKeyPrefix: LIVEKIT_API_KEY?.substring(0, 15) + '...',
      apiKeyLength: LIVEKIT_API_KEY?.length,
      apiSecretLength: LIVEKIT_API_SECRET?.length,
      urlMatches: LIVEKIT_URL?.includes('mylivelinkscom'),
      tokenPayload: tokenPayload ? {
        sub: tokenPayload.sub,
        iss: tokenPayload.iss,
        exp: tokenPayload.exp,
        video: tokenPayload.video,
        room: tokenPayload.video?.room,
      } : null,
    });

    // PARITY AUDIT: Log decoded grants (no secrets) to prove publish/subscribe/room/identity correctness
    console.log('[PARITY-PROOF][TOKEN_AUDIT] decoded_grants', {
      requestedRoomName: roomName,
      requestedCanPublish: canPublish === true,
      requestedCanSubscribe: canSubscribe !== false,
      identity,
      decoded: tokenPayload
        ? {
            room: tokenPayload.video?.room,
            roomJoin: tokenPayload.video?.roomJoin,
            canPublish: tokenPayload.video?.canPublish,
            canSubscribe: tokenPayload.video?.canSubscribe,
            canPublishData: tokenPayload.video?.canPublishData,
          }
        : null,
    });

    // Validate URL format
    if (!LIVEKIT_URL || (!LIVEKIT_URL.startsWith('wss://') && !LIVEKIT_URL.startsWith('ws://') && !LIVEKIT_URL.startsWith('https://'))) {
      console.error('Invalid LIVEKIT_URL format:', LIVEKIT_URL);
      return NextResponse.json(
        { error: 'Invalid LiveKit URL format. Must start with wss://, ws://, or https://' },
        { status: 500 }
      );
    }

    // Ensure URL is WebSocket format for client connection
    let wsUrl = LIVEKIT_URL;
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
      wsUrl = `wss://${wsUrl}`;
    }

    console.log('[PARITY-PROOF][TOKEN_API] minted', {
      requestedRoomName: roomName,
      participantName,
      identity,
      canPublish: canPublish === true,
      canSubscribe: canSubscribe !== false,
      role: effectiveRole,
      deviceType: effectiveDeviceType,
      // avoid logging full deviceId/sessionId if desired; but parity proof often needs exact values
      deviceId: effectiveDeviceId,
      sessionId: effectiveSessionId,
      wsUrl,
      livekitUrlEnv: LIVEKIT_URL,
    });

    return NextResponse.json({
      token,
      url: wsUrl,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500, headers: corsHeaders }
    );
  }
}

