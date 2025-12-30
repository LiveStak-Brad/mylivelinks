import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { canUserGoLive } from '@/lib/livekit-constants';

const TOKEN_ROUTE_VERSION = 'mll-token-2025-12-29a';

// Trim whitespace from environment variables to prevent issues
const LIVEKIT_URL = process.env.LIVEKIT_URL?.trim();
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY?.trim();
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET?.trim();

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
  return NextResponse.json(
    {},
    {
      headers: {
        ...corsHeaders,
        'X-MLL-TOKEN-ROUTE': TOKEN_ROUTE_VERSION,
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const HARD_TIMEOUT_MS = 10_000;
  const reqId = (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(16).slice(2, 10);
  const t0 = Date.now();
  const path = request.nextUrl?.pathname || '/api/livekit/token';

  console.log('[LIVEKIT_TOKEN] request_start', {
    reqId,
    method: request.method,
    path,
    ts: new Date().toISOString(),
  });

  let responded = false;
  const sendJson = (status: number, body: any, stage?: string) => {
    if (!responded) {
      responded = true;
      console.log('[LIVEKIT_TOKEN] response_sent', {
        reqId,
        stage,
        status,
        ms: Date.now() - t0,
      });
    }
    return NextResponse.json(body, {
      status,
      headers: {
        ...corsHeaders,
        'X-MLL-TOKEN-ROUTE': TOKEN_ROUTE_VERSION,
        'X-MLL-REQID': reqId,
      },
    });
  };

  class StageTimeoutError extends Error {
    stage: string;
    constructor(stage: string) {
      super('Stage timed out');
      this.stage = stage;
    }
  }

  const runStage = async <T,>(stage: string, timeoutMs: number, fn: () => Promise<T>): Promise<T> => {
    console.log('[LIVEKIT_TOKEN] stage_start', { reqId, stage, status: null, ms: Date.now() - t0, timeoutMs });
    let timeoutHandle: any;
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_resolve, reject) => {
          timeoutHandle = setTimeout(() => reject(new StageTimeoutError(stage)), timeoutMs);
        }),
      ]);
      console.log('[LIVEKIT_TOKEN] stage_done', { reqId, stage, status: null, ms: Date.now() - t0 });
      return result;
    } catch (err: any) {
      console.log('[LIVEKIT_TOKEN] stage_done', {
        reqId,
        stage,
        status: null,
        ms: Date.now() - t0,
        error: err instanceof StageTimeoutError ? 'timeout' : 'error',
      });
      throw err;
    } finally {
      try {
        clearTimeout(timeoutHandle);
      } catch {
        // ignore
      }
    }
  };

  let hardTimeoutId: any;
  const hardTimeoutPromise = new Promise<NextResponse>((resolve) => {
    hardTimeoutId = setTimeout(() => {
      resolve(sendJson(504, { error: 'Request timed out', stage: 'hard_timeout' }, 'hard_timeout'));
    }, HARD_TIMEOUT_MS);
  });

  const main = (async (): Promise<NextResponse> => {
    try {
      const authHeader = await runStage('auth_header_parse', 1_000, async () => {
        return request.headers.get('authorization') || request.headers.get('Authorization') || '';
      });

      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

      const auth = await runStage('auth_verify', 3_000, async () => {
        const cookieClient = createRouteHandlerClient(request);

        if (bearerToken) {
          const admin = getSupabaseAdmin();
          const result = await (admin.auth as any).getUser(bearerToken);
          return {
            user: result?.data?.user || null,
            authError: result?.error || null,
            supabase: admin as any,
          };
        }

        const result = await cookieClient.auth.getUser();
        return {
          user: result.data?.user || null,
          authError: result.error || null,
          supabase: cookieClient as any,
        };
      });

      const user = auth.user;
      const authError = auth.authError;

      if (authError || !user) {
        return sendJson(401, { error: 'Unauthorized', stage: 'auth_verify' }, 'auth_verify');
      }

      let body: any;
      try {
        body = await runStage('body_parse', 1_000, async () => await request.json());
      } catch (err: any) {
        if (err instanceof StageTimeoutError) {
          return sendJson(504, { error: 'Request timed out', stage: err.stage }, err.stage);
        }
        return sendJson(400, { error: 'Invalid JSON', stage: 'body_parse' }, 'body_parse');
      }

      const roomName = body?.roomName;
      const participantName = body?.participantName;
      const participantMetadata = body?.participantMetadata;
      const canPublish = body?.canPublish;
      const canSubscribe = body?.canSubscribe;
      const deviceType = body?.deviceType;
      const deviceId = body?.deviceId;
      const sessionId = body?.sessionId;

      if (!roomName || !participantName) {
        return sendJson(400, { error: 'roomName and participantName are required', stage: 'body_parse' }, 'body_parse');
      }

      const wantsPublish = canPublish === true || body?.role === 'publisher';
      const canGoLive = await runStage('can_user_go_live', 1_000, async () => {
        return canUserGoLive({ id: user.id, email: user.email });
      });
      const effectiveCanPublish = wantsPublish && canGoLive;

      if (wantsPublish && !effectiveCanPublish) {
        console.log('[LIVEKIT_TOKEN] publish_denied_non_owner', { reqId, userId: user.id, roomName });
      }

      if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return sendJson(500, { error: 'LiveKit env/config missing', stage: 'token_sign' }, 'token_sign');
      }

      try {
        const tokenResult = await runStage('token_sign', 3_000, async () => {
          const userId = String(user.id);
          const effectiveDeviceType = deviceType || 'web';
          const effectiveDeviceId = deviceId || 'unknown';
          const effectiveSessionId = sessionId || Date.now().toString();
          const identity = `u_${userId}:${effectiveDeviceType}:${effectiveDeviceId}:${effectiveSessionId}`;

          const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity,
            name: participantName,
            ttl: '6h',
          });

          at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: effectiveCanPublish,
            canSubscribe: canSubscribe !== false,
            canPublishData: true,
            canUpdateOwnMetadata: true,
          });

          if (participantMetadata) {
            at.metadata = JSON.stringify(participantMetadata);
          }

          let wsUrl = LIVEKIT_URL;
          if (wsUrl.startsWith('https://')) {
            wsUrl = wsUrl.replace('https://', 'wss://');
          } else if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
            wsUrl = `wss://${wsUrl}`;
          }

          const token = await at.toJwt();
          return { token, wsUrl };
        });

        return sendJson(200, { token: tokenResult.token, url: tokenResult.wsUrl }, 'token_sign');
      } catch (err: any) {
        if (err instanceof StageTimeoutError) {
          return sendJson(504, { error: 'Request timed out', stage: err.stage }, err.stage);
        }

        return sendJson(500, { error: 'LiveKit token signing failed', stage: 'token_sign' }, 'token_sign');
      }
    } catch (err: any) {
      if (err instanceof StageTimeoutError) {
        return sendJson(504, { error: 'Request timed out', stage: err.stage }, err.stage);
      }
      return sendJson(500, { error: 'Internal Server Error', stage: 'handler' }, 'handler');
    }
  })();

  try {
    return await Promise.race([main, hardTimeoutPromise]);
  } finally {
    try {
      clearTimeout(hardTimeoutId);
    } catch {
      // ignore
    }
  }
}

