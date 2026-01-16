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

// CORS: strict allowlist for sensitive auth endpoint
const ALLOWED_ORIGINS = new Set(
  [
    'https://www.mylivelinks.com',
    'https://mylivelinks.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ].map((v) => v.toLowerCase())
);

const getCorsHeaders = (request: NextRequest) => {
  const origin = (request.headers.get('origin') || '').toLowerCase();
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.mylivelinks.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
};

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        ...getCorsHeaders(request),
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
        ...getCorsHeaders(request),
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
      const isMobileRequest = !!bearerToken; // Mobile uses Bearer token, web uses cookies

      // CORS check only for web (non-Bearer) requests
      if (!isMobileRequest) {
        const origin = (request.headers.get('origin') || '').toLowerCase();
        if (!origin || !ALLOWED_ORIGINS.has(origin)) {
          return sendJson(403, { error: 'Invalid origin', stage: 'cors' }, 'cors');
        }
      }

      const auth = await runStage('auth_verify', 3_000, async () => {
        if (isMobileRequest && bearerToken) {
          // Mobile: validate Bearer token via Supabase
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          
          if (!supabaseUrl || !supabaseAnonKey) {
            return { user: null, authError: new Error('Supabase config missing'), supabase: null };
          }
          
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${bearerToken}` } },
          });
          
          const result = await supabase.auth.getUser(bearerToken);
          return {
            user: result.data?.user || null,
            authError: result.error || null,
            supabase: supabase as any,
          };
        } else {
          // Web: use cookie-based auth
          const cookieClient = createRouteHandlerClient(request);
          const result = await cookieClient.auth.getUser();
          return {
            user: result.data?.user || null,
            authError: result.error || null,
            supabase: cookieClient as any,
          };
        }
      });

      const user = auth.user;
      const authError = auth.authError;
      const supabase = auth.supabase;

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

      // ROOM GATE: Allow live_central (group mode), solo_* (solo streams), battle_*/cohost_* (sessions), and call_* (1:1 calls)
      // Solo streams use unique room names:
      // - solo_${live_stream_id} (numeric) - e.g. solo_12345
      // - solo_${profile_id} (UUID) - e.g. solo_abc123-def456-...
      // Battle/Cohost sessions use:
      // - battle_${session_uuid} - e.g. battle_abc123-def456-...
      // - cohost_${session_uuid} - e.g. cohost_abc123-def456-...
      // 1:1 Calls use:
      // - call_${call_uuid} - e.g. call_abc123-def456-...
      const isLiveCentralRoom = roomName === 'live_central' || roomName === 'live-central';
      const isSoloRoom = /^solo_[a-f0-9-]+$/i.test(roomName); // solo_ followed by alphanumeric/dashes (covers both IDs)
      const isBattleRoom = /^battle_[a-f0-9-]+$/i.test(roomName); // battle_ followed by UUID
      const isCohostRoom = /^cohost_[a-f0-9-]+$/i.test(roomName); // cohost_ followed by UUID
      const isCallRoom = /^call_[a-f0-9-]+$/i.test(roomName); // call_ followed by UUID (1:1 calls)
      const isSessionRoom = isBattleRoom || isCohostRoom;
      
      if (!isLiveCentralRoom && !isSoloRoom && !isSessionRoom && !isCallRoom) {
        console.log('[LIVEKIT_TOKEN] Room gate blocked:', { roomName, isLiveCentralRoom, isSoloRoom, isSessionRoom, isCallRoom });
        return sendJson(403, { error: 'Room not available', stage: 'room_gate' }, 'room_gate');
      }
      
      console.log('[LIVEKIT_TOKEN] Room gate passed:', { roomName, isLiveCentralRoom, isSoloRoom, isSessionRoom, isCallRoom });

      const wantsPublish = canPublish === true || body?.role === 'publisher';
      const isGuestRole = body?.role === 'guest';
      const isHostRole = body?.role === 'host';
      
      // Check room type for permission logic
      const isMainRoom = roomName === 'live_central' || roomName === 'live-central';
      const isSoloStreamRoom = /^solo_[a-f0-9-]+$/i.test(roomName);
      
      // BATTLE/COHOST SESSION ROOM: Check if user is a participant in the session
      // Extract session_id from room name (battle_<uuid> or cohost_<uuid>)
      let isSessionParticipant = false;
      if (isSessionRoom && wantsPublish) {
        const sessionId = roomName.replace(/^(battle|cohost)_/i, '');
        try {
          const adminClient = getSupabaseAdmin();
          const { data: session } = await adminClient
            .from('live_sessions')
            .select('host_a, host_b, status')
            .eq('id', sessionId)
            .in('status', ['active', 'cooldown'])
            .maybeSingle();
          
          if (session && (session.host_a === user.id || session.host_b === user.id)) {
            isSessionParticipant = true;
            console.log('[LIVEKIT_TOKEN] User is session participant, allowing publish', { 
              userId: user.id, 
              sessionId,
              roomName 
            });
          } else {
            console.log('[LIVEKIT_TOKEN] User is NOT session participant', { 
              userId: user.id, 
              sessionId,
              session: session ? { host_a: session.host_a, host_b: session.host_b } : null 
            });
          }
        } catch (err) {
          console.log('[LIVEKIT_TOKEN] Error checking session participant:', err);
        }
      }
      
      // 1:1 CALL ROOM: Check if user is a participant in the call
      // Extract call_id from room name (call_<uuid>)
      // NOTE: Mobile uses call_sessions table, web uses calls table - check both for compatibility
      let isCallParticipant = false;
      if (isCallRoom) {
        const callId = roomName.replace(/^call_/i, '');
        try {
          const adminClient = getSupabaseAdmin();
          
          // First check call_sessions (mobile canonical table)
          const { data: callSession } = await adminClient
            .from('call_sessions')
            .select('caller_id, callee_id, status')
            .eq('id', callId)
            .in('status', ['pending', 'accepted', 'active'])
            .maybeSingle();
          
          if (callSession && (callSession.caller_id === user.id || callSession.callee_id === user.id)) {
            isCallParticipant = true;
            console.log('[LIVEKIT_TOKEN] User is call_sessions participant, allowing publish', { 
              userId: user.id, 
              callId,
              roomName,
              status: callSession.status
            });
          } else {
            // Fallback: check calls table (web schema) for backward compatibility
            const { data: call } = await adminClient
              .from('calls')
              .select('caller_id, callee_id, status')
              .eq('id', callId)
              .in('status', ['ringing', 'accepted'])
              .maybeSingle();
            
            if (call && (call.caller_id === user.id || call.callee_id === user.id)) {
              isCallParticipant = true;
              console.log('[LIVEKIT_TOKEN] User is calls participant, allowing publish', { 
                userId: user.id, 
                callId,
                roomName 
              });
            } else {
              console.log('[LIVEKIT_TOKEN] User is NOT call participant in either table', { 
                userId: user.id, 
                callId,
                callSession: callSession ? { caller_id: callSession.caller_id, callee_id: callSession.callee_id, status: callSession.status } : null,
                call: call ? { caller_id: call.caller_id, callee_id: call.callee_id, status: call.status } : null 
              });
            }
          }
        } catch (err) {
          console.log('[LIVEKIT_TOKEN] Error checking call participant:', err);
        }
      }
      
      const canGoLive = await runStage('can_user_go_live', 2_000, async () => {
        try {
          // SOLO STREAM ROOMS: Use canUserGoLiveSolo permission check
          // Solo rooms are format: solo_${live_stream_id}
          if (isSoloStreamRoom) {
            // Import canUserGoLiveSolo dynamically to check solo permissions
            const { canUserGoLiveSolo } = await import('@/lib/livekit-constants');
            const allowed = canUserGoLiveSolo({ id: user.id, email: user.email });
            console.log('[LIVEKIT_TOKEN] Solo room permission check:', {
              userId: user.id,
              roomName,
              isSoloStreamRoom: true,
              isHostRole,
              allowed,
              wantsPublish,
            });
            return allowed;
          }
          
          // MAIN ROOM (live_central): Use canUserGoLive permission check
          if (isMainRoom) {
            const allowed = canUserGoLive({ id: user.id, email: user.email });
            console.log('[LIVEKIT_TOKEN] Main room permission check:', {
              userId: user.id,
              roomName,
              isMainRoom: true,
              allowed,
              wantsPublish,
            });
            return allowed;
          }

          // Check room-specific permissions for other rooms
          if (roomName) {
            // Try to get room config for permission check
            const { data: roomConfig, error: roomErr } = await (supabase as any).rpc('rpc_get_room_config', {
              p_slug: roomName,
            });
            
            if (!roomErr && roomConfig?.permissions) {
              // For team/official rooms, use the room's permission system
              return roomConfig.permissions.canPublish === true;
            }
            
            // If room starts with 'team-', check team membership
            if (roomName.startsWith('team-')) {
              const teamSlug = roomName.replace('team-', '');
              const { data: teamData } = await (supabase as any)
                .from('teams')
                .select('id')
                .eq('slug', teamSlug)
                .single();
              
              if (teamData?.id) {
                // Check if user has publish role in team
                const { data: membership } = await (supabase as any)
                  .from('team_memberships')
                  .select('role, status')
                  .eq('team_id', teamData.id)
                  .eq('profile_id', user.id)
                  .eq('status', 'approved')
                  .single();
                
                if (membership) {
                  const publishRoles = ['team_admin', 'owner', 'admin', 'moderator'];
                  return publishRoles.includes(membership.role);
                }
              }
              return false; // Not a team member
            }
          }

          // Fallback for unknown rooms - check owner/tester status
          const [{ data: isOwner, error: ownerErr }, { data: isTester, error: testerErr }] = await Promise.all([
            (supabase as any).rpc('is_owner', { p_profile_id: user.id }),
            (supabase as any).rpc('is_live_tester', { p_profile_id: user.id }),
          ]);

          if (!ownerErr && isOwner === true) return true;
          if (!testerErr && isTester === true) return true;
        } catch (err) {
          console.log('[LIVEKIT_TOKEN] can_user_go_live error:', err);
          // Fall through to default
        }

        // Default fallback
        return false;
      });
      
      // Check if user is an accepted guest (can publish even if not on go-live list)
      let isAcceptedGuest = false;
      if (isGuestRole && wantsPublish) {
        try {
          const adminClient = getSupabaseAdmin();
          const { data: guestRequest } = await adminClient
            .from('guest_requests')
            .select('id, status')
            .eq('requester_id', user.id)
            .eq('status', 'accepted')
            .limit(1)
            .maybeSingle();
          
          if (guestRequest) {
            isAcceptedGuest = true;
            console.log('[LIVEKIT_TOKEN] User is an accepted guest, allowing publish', { userId: user.id });
          }
        } catch (err) {
          console.log('[LIVEKIT_TOKEN] Error checking guest status:', err);
        }
      }

      // For launch: publish is granted when:
      // 1. Explicitly requested AND admin-gated (regular streamers), OR
      // 2. User is an accepted guest, OR
      // 3. User is a battle/cohost session participant (host_a or host_b), OR
      // 4. User is a 1:1 call participant (caller or callee)
      const effectiveCanPublish = (wantsPublish && canGoLive) || isAcceptedGuest || isSessionParticipant || isCallParticipant;

      if (wantsPublish && !effectiveCanPublish) {
        console.log('[LIVEKIT_TOKEN] publish_denied', { reqId, userId: user.id, roomName, isMainRoom, canGoLive });
      }
      
      console.log('[LIVEKIT_TOKEN] Permission result:', { 
        reqId, 
        userId: user.id, 
        roomName, 
        isMainRoom,
        isSessionRoom,
        isSessionParticipant,
        isCallRoom,
        isCallParticipant,
        wantsPublish, 
        canGoLive, 
        effectiveCanPublish 
      });

      if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return sendJson(500, { error: 'LiveKit env/config missing', stage: 'token_sign' }, 'token_sign');
      }

      try {
        const tokenResult = await runStage('token_sign', 3_000, async () => {
          const userId = String(user.id);
          const effectiveDeviceType = deviceType || 'web';
          const effectiveDeviceId = deviceId || 'unknown';
          const effectiveSessionId = sessionId || Date.now().toString();

          // P0 FIX: Stable identity per profile to prevent duplicate LiveKit participants
          // For guests, use guest_ prefix so their tracks can be filtered to guest boxes only
          const identity = isAcceptedGuest ? `guest_${userId}` : `u_${userId}`;

          const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity,
            name: participantName,
            // LAUNCH GATE: short-lived tokens to reduce reuse risk
            ttl: '15m',
          });

          at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: effectiveCanPublish,
            canSubscribe: canSubscribe !== false,
            canPublishData: true,
            canUpdateOwnMetadata: true,
          });

          const metadataPayload = {
            ...(participantMetadata && typeof participantMetadata === 'object' ? participantMetadata : {}),
            device_type: effectiveDeviceType,
            device_id: effectiveDeviceId,
            session_id: effectiveSessionId,
          };
          at.metadata = JSON.stringify(metadataPayload);

          let wsUrl = LIVEKIT_URL;
          if (wsUrl.startsWith('https://')) {
            wsUrl = wsUrl.replace('https://', 'wss://');
          } else if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
            wsUrl = `wss://${wsUrl}`;
          }

          const token = await at.toJwt();
          
          console.log('[LIVEKIT_TOKEN] Token minted successfully:', {
            reqId,
            identity,
            roomName,
            canPublish: effectiveCanPublish,
            isSoloStreamRoom,
            isMainRoom,
          });
          
          return { token, wsUrl, identity, roomName, canPublish: effectiveCanPublish };
        });

        // Return roomName and identity in response for client-side debugging
        return sendJson(200, { 
          token: tokenResult.token, 
          url: tokenResult.wsUrl,
          // Debug fields - helps verify correct room/identity on client
          roomName: tokenResult.roomName,
          identity: tokenResult.identity,
          canPublish: tokenResult.canPublish,
        }, 'token_sign');
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

