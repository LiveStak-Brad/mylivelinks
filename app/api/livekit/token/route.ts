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
  const HARD_TIMEOUT_MS = 10_000;
  const STAGE_TIMEOUT_MS = 3_000;
  const reqId = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(16).slice(2, 10);
  const t0 = Date.now();
  const path = request.nextUrl?.pathname || '/api/livekit/token';
  const log = (phase: string, extra?: Record<string, any>) => {
    try {
      console.log('[LIVEKIT_TOKEN_ROUTE]', {
        ts: new Date().toISOString(),
        reqId,
        phase,
        ms: Date.now() - t0,
        method: request.method,
        path,
        ...(extra || {}),
      });
    } catch {
      // ignore
    }
  };

  let responded = false;
  const respond = (status: number, body: any) => {
    if (!responded) {
      responded = true;
      log('response_sent', { status });
    }
    return NextResponse.json(body, { status, headers: corsHeaders });
  };

  class StageTimeoutError extends Error {
    stage: string;
    timeoutMs: number;
    constructor(stage: string, timeoutMs: number) {
      super(`Stage timed out: ${stage}`);
      this.stage = stage;
      this.timeoutMs = timeoutMs;
    }
  }

  const withStageTimeout = async <T,>(stage: string, fn: () => Promise<T>, timeoutMs = STAGE_TIMEOUT_MS): Promise<T> => {
    log('stage_start', { stage, timeoutMs });
    let timeoutHandle: any;
    const timeoutPromise = new Promise<T>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => reject(new StageTimeoutError(stage, timeoutMs)), timeoutMs);
    });
    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      log('stage_done', { stage });
      return result as T;
    } finally {
      try {
        clearTimeout(timeoutHandle);
      } catch {
        // ignore
      }
    }
  };

  log('request_start', {
    host: request.headers.get('host'),
    hasAuthHeader: !!(request.headers.get('authorization') || request.headers.get('Authorization')),
  });

  let timeoutId: any;
  const timeoutResponse = new Promise<NextResponse>((resolve) => {
    timeoutId = setTimeout(() => {
      log('hard_timeout');
      resolve(respond(504, { error: 'Request timed out', stage: 'hard_timeout', reqId }));
    }, HARD_TIMEOUT_MS);
  });

  const main = (async (): Promise<NextResponse> => {
    try {
      log('env_validate_start');

      // Validate environment variables with detailed error messages
      if (!LIVEKIT_URL) {
        log('env_validate_fail', { missing: 'LIVEKIT_URL' });
        return respond(500, {
          error: 'LiveKit URL not configured. Please set LIVEKIT_URL in Vercel environment variables.',
        });
      }
      if (!LIVEKIT_API_KEY) {
        log('env_validate_fail', { missing: 'LIVEKIT_API_KEY' });
        return respond(500, {
          error: 'LiveKit API Key not configured. Please set LIVEKIT_API_KEY in Vercel environment variables.',
        });
      }
      if (!LIVEKIT_API_SECRET) {
        log('env_validate_fail', { missing: 'LIVEKIT_API_SECRET' });
        return respond(500, {
          error: 'LiveKit API Secret not configured. Please set LIVEKIT_API_SECRET in Vercel environment variables.',
        });
      }
      log('env_validate_done', {
        hasUrl: true,
        hasApiKey: true,
        hasApiSecret: true,
      });

      // Create Supabase client with proper route handler support
      let supabase = createRouteHandlerClient(request);

      const authHeaderParse = await withStageTimeout('auth_header_parse', async () => {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
        return { authHeader, bearerToken };
      });

      const authHeader = authHeaderParse.authHeader;
      const bearerToken = authHeaderParse.bearerToken;
      log('auth_header_parse_done', { usedBearer: !!bearerToken, hasAuthHeader: !!authHeader });

      // Get authenticated user (supports cookie auth for web and Bearer token auth for mobile)
      log('before_auth_verify');
      const auth = await withStageTimeout('supabase_getUser', async () => {
        let user: any = null;
        let authError: any = null;
        let effectiveSupabase: any = supabase;

        if (bearerToken) {
          const admin = getSupabaseAdmin();
          const result = await (admin.auth as any).getUser(bearerToken);
          user = result?.data?.user || null;
          authError = result?.error || null;
          effectiveSupabase = admin as any;
        } else {
          const result = await effectiveSupabase.auth.getUser();
          user = result.data?.user || null;
          authError = result.error || null;
        }

        return { user, authError, effectiveSupabase };
      });

      const user = auth.user;
      const authError = auth.authError;
      supabase = auth.effectiveSupabase;

      log('auth_verify_done', {
        hasUser: !!user,
        hasAuthError: !!authError,
        userIdPrefix: user?.id ? String(user.id).slice(0, 8) : null,
      });

      if (authError || !user) {
        log('auth_rejected', {
          usedBearer: !!bearerToken,
          errorMessage: authError?.message || null,
          supabaseProjectRef: SUPABASE_URL?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? null,
        });
        return respond(401, { error: 'Unauthorized - Please log in', stage: 'supabase_getUser', reqId });
      }

      // Get request body
      let body: any;
      try {
        body = await withStageTimeout('body_parse', async () => request.json());
      } catch (err: any) {
        if (err instanceof StageTimeoutError) {
          log('stage_timeout', { stage: err.stage, timeoutMs: err.timeoutMs });
          return respond(504, { error: 'Stage timed out', stage: err.stage, timeoutMs: err.timeoutMs, reqId });
        }
        log('body_parse_error', { message: err?.message || 'invalid_json' });
        return respond(400, { error: 'Invalid JSON body', stage: 'body_parse', reqId });
      }

      log('body_parse_done', {
        hasRoomName: !!body?.roomName,
        hasParticipantName: !!body?.participantName,
      });

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

      try {
        const allowed = await withStageTimeout('canAccessLive', async () => {
          return canAccessLive({ id: user.id, email: user.email });
        });
        if (!allowed) {
          log('access_denied');
          return respond(403, { error: 'Live is not available yet', stage: 'canAccessLive', reqId });
        }
      } catch (err: any) {
        if (err instanceof StageTimeoutError) {
          log('stage_timeout', { stage: err.stage, timeoutMs: err.timeoutMs });
          return respond(504, { error: 'Stage timed out', stage: err.stage, timeoutMs: err.timeoutMs, reqId });
        }
        throw err;
      }

      log('body_validate_start');
      // Validate required fields
      if (!roomName || !participantName) {
        log('body_validate_fail', {
          missingRoomName: !roomName,
          missingParticipantName: !participantName,
        });
        return respond(400, { error: 'roomName and participantName are required', stage: 'body_parse', reqId });
      }
      log('body_validate_done', {
        canPublish: canPublish === true,
        canSubscribe: canSubscribe !== false,
        hasDeviceType: !!deviceType,
        hasDeviceId: !!deviceId,
        hasSessionId: !!sessionId,
      });

      // Get user's profile for metadata
      log('profile_fetch_start');
      const { data: profile } = await withStageTimeout('profile_fetch', async () => {
        return supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', user.id)
          .single();
      });
      log('profile_fetch_done', { hasProfile: !!profile });

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

      log('token_generate_start', {
        roomName,
        identityPrefix: identity.slice(0, 24),
        role: effectiveRole,
      });

      // Validate API key/secret format (they should be strings)
      // Check for common issues: whitespace, newlines, quotes
      const apiKeyClean = LIVEKIT_API_KEY?.replace(/[\r\n\t\s"']/g, '');
      const apiSecretClean = LIVEKIT_API_SECRET?.replace(/[\r\n\t\s"']/g, '');

      if (typeof LIVEKIT_API_KEY !== 'string' || LIVEKIT_API_KEY.length < 10) {
        log('env_validate_fail', { invalid: 'LIVEKIT_API_KEY' });
        return respond(500, {
          error: 'Invalid LiveKit API Key format. Please check your Vercel environment variables.',
        });
      }
      if (typeof LIVEKIT_API_SECRET !== 'string' || LIVEKIT_API_SECRET.length < 10) {
        log('env_validate_fail', { invalid: 'LIVEKIT_API_SECRET' });
        return respond(500, {
          error: 'Invalid LiveKit API Secret format. Please check your Vercel environment variables.',
        });
      }

      // Use cleaned versions if there were whitespace issues
      const finalApiKey = apiKeyClean || LIVEKIT_API_KEY;
      const finalApiSecret = apiSecretClean || LIVEKIT_API_SECRET;

      let at: AccessToken;
      try {
        // Create token with 6 hour expiration - use cleaned credentials
        at = new AccessToken(finalApiKey, finalApiSecret, {
          identity: identity,
          name: name,
          ttl: '6h', // 6 hours expiration
        });
      } catch (tokenErr: any) {
        log('token_create_error', { message: tokenErr?.message || 'create_failed' });
        return respond(500, {
          error: `Failed to create LiveKit token: ${tokenErr.message || 'Invalid API credentials'}`,
        });
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
      log('token_sign_start');
      let token: string;
      try {
        token = await withStageTimeout('livekit_token_sign', async () => at.toJwt());
      } catch (jwtErr: any) {
        if (jwtErr instanceof StageTimeoutError) {
          log('stage_timeout', { stage: jwtErr.stage, timeoutMs: jwtErr.timeoutMs });
          return respond(504, { error: 'Stage timed out', stage: jwtErr.stage, timeoutMs: jwtErr.timeoutMs, reqId });
        }
        log('token_sign_error', { message: jwtErr?.message || 'toJwt_failed' });
        return respond(500, { error: `Failed to generate token: ${jwtErr.message || 'Unknown error'}`, stage: 'livekit_token_sign', reqId });
      }
      log('token_sign_done', { tokenLength: typeof token === 'string' ? token.length : null });

      // Validate token was generated
      if (!token || typeof token !== 'string' || token.length < 50) {
        log('token_invalid', { tokenType: typeof token, tokenLength: typeof token === 'string' ? token.length : null });
        return respond(500, { error: 'Failed to generate valid token' });
      }

      // Validate URL format
      if (!LIVEKIT_URL || (!LIVEKIT_URL.startsWith('wss://') && !LIVEKIT_URL.startsWith('ws://') && !LIVEKIT_URL.startsWith('https://'))) {
        log('env_validate_fail', { invalid: 'LIVEKIT_URL' });
        return respond(500, { error: 'Invalid LiveKit URL format. Must start with wss://, ws://, or https://' });
      }

      // Ensure URL is WebSocket format for client connection
      let wsUrl = LIVEKIT_URL;
      if (wsUrl.startsWith('https://')) {
        wsUrl = wsUrl.replace('https://', 'wss://');
      } else if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
        wsUrl = `wss://${wsUrl}`;
      }

      log('token_generate_done', {
        wsUrlHost: (() => {
          try {
            return new URL(wsUrl).host;
          } catch {
            return null;
          }
        })(),
      });

      return respond(200, { token, url: wsUrl });
    } catch (error: any) {
      if (error instanceof StageTimeoutError) {
        log('stage_timeout', { stage: error.stage, timeoutMs: error.timeoutMs });
        return respond(504, { error: 'Stage timed out', stage: error.stage, timeoutMs: error.timeoutMs, reqId });
      }
      log('handler_error', { message: error?.message || 'unknown_error' });
      return respond(500, { error: error.message || 'Failed to generate token', stage: 'handler', reqId });
    }
  })();

  try {
    const res = await Promise.race([main, timeoutResponse]);
    return res;
  } finally {
    try {
      clearTimeout(timeoutId);
    } catch {
      // ignore
    }
  }
}

