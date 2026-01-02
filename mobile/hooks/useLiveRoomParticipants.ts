/**
 * LiveKit Room Hook - REAL IMPLEMENTATION
 * Connects to LiveKit room and manages participants
 * 
 * CRITICAL RULES:
 * - Connect ONCE on mount (use ref guards)
 * - NEVER reconnect on rerender
 * - Maintain stable participants list
 * - Clean up on unmount
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import type { LocalParticipant, Room, RemoteParticipant } from 'livekit-client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { Participant } from '../types/live';
import { getMobileIdentity } from '../lib/mobileIdentity';
import { getDeviceId, generateSessionId } from '../lib/deviceId';
import { selectGridParticipants, type ParticipantLite, type SortMode } from '../lib/live';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

import { LIVEKIT_ROOM_NAME, TOKEN_ENDPOINT_PATH, DEBUG_LIVEKIT, canUserGoLive } from '../lib/livekit-constants';

const DEBUG = DEBUG_LIVEKIT;
const ROOM_NAME = LIVEKIT_ROOM_NAME; // Imported from shared constants
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com').replace(/\/+$/, '');
const TOKEN_ENDPOINT = `${API_BASE_URL}${TOKEN_ENDPOINT_PATH}`;

const nowMs = (): number => {
  try {
    const p: any = (globalThis as any)?.performance;
    if (p && typeof p.now === 'function') return p.now();
  } catch {
    // ignore
  }
  return Date.now();
};

const getErrorDetails = (error: any): { name: string | null; message: string | null; cause: string | null } => {
  const name = error?.name ? String(error.name) : null;
  const message = error?.message ? String(error.message) : null;
  let cause: string | null = null;
  try {
    if (error?.cause) {
      if (typeof error.cause === 'string') cause = error.cause;
      else if (error.cause?.message) cause = String(error.cause.message);
      else cause = String(error.cause);
    }
  } catch {
    // ignore
  }
  return { name, message, cause };
};

const redactTokenFromText = (text: string): string => {
  if (!text) return text;
  // Best-effort redact any token fields in JSON.
  return text.replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[redacted]"');
};

const toSnippet = (text: string, limit = 500): string => {
  return (text || '').slice(0, limit);
};

const isValidWsUrl = (url: string | null | undefined): url is string => {
  return typeof url === 'string' && url.length > 0 && url.startsWith('wss://');
};

interface UseLiveRoomParticipantsReturn {
  participants: Participant[];
  myIdentity: string | null;
  isConnected: boolean;
  goLive: () => Promise<void>;
  stopLive: () => Promise<void>;
  endOtherStream: () => Promise<void>;
  resumeOnThisDevice: () => Promise<void>;
  isLive: boolean;
  isPublishing: boolean;
  tileCount: number;
  room: Room | null;
  connectionError: string | null;
  tokenDebug: { endpoint: string; status: number | null; bodySnippet: string | null };
  connectDebug: { wsUrl: string | null; errorMessage: string | null; reachedConnected: boolean };
  lastTokenEndpoint: string;
  lastTokenError: { status: number | null; bodySnippet: string; message: string } | null;
  lastWsUrl: string | null;
  lastConnectError: string | null;
}

interface UseLiveRoomParticipantsOptions {
  enabled?: boolean; // gate connect until login/device/env ready
}

/**
 * Real LiveKit integration hook
 * Connects to room and subscribes to remote video tracks
 * Uses Agent 3's selection engine for stable 12-tile grid
 */
export function useLiveRoomParticipants(
  options: UseLiveRoomParticipantsOptions = {}
): UseLiveRoomParticipantsReturn {
  const { enabled = false } = options;
  if (DEBUG) console.log('[ROOM] useLiveRoomParticipants invoked');

  const { user, getAccessToken } = useAuthContext();
  type LiveKitParticipant = RemoteParticipant | LocalParticipant;
  const [allParticipants, setAllParticipants] = useState<LiveKitParticipant[]>([]);
  const [myIdentity, setMyIdentity] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [tokenDebug, setTokenDebug] = useState<{ endpoint: string; status: number | null; bodySnippet: string | null }>(() => ({
    endpoint: TOKEN_ENDPOINT,
    status: null,
    bodySnippet: null,
  }));
  const [connectDebug, setConnectDebug] = useState<{ wsUrl: string | null; errorMessage: string | null; reachedConnected: boolean }>(() => ({
    wsUrl: null,
    errorMessage: null,
    reachedConnected: false,
  }));
  const [lastTokenError, setLastTokenError] = useState<{ status: number | null; bodySnippet: string; message: string } | null>(null);
  const [lastWsUrl, setLastWsUrl] = useState<string | null>(null);
  const [lastConnectError, setLastConnectError] = useState<string | null>(null);
  const tokenAttemptIdRef = useRef(0);
  const tokenAttemptInFlightRef = useRef<number | null>(null);
  const isLiveRef = useRef(false);
  const isPublishingRef = useRef(false);
  const goLiveInFlightRef = useRef(false);
  const stopLiveInFlightRef = useRef(false);
  const myProfileIdRef = useRef<string | null>(null);

  const extractProfileIdFromIdentity = useCallback((identityRaw: string | null | undefined): string | null => {
    const identity = typeof identityRaw === 'string' ? identityRaw : '';
    if (!identity) return null;
    if (identity.startsWith('u_')) {
      const rest = identity.slice('u_'.length);
      const profileId = rest.split(':')[0];
      return profileId || null;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity)) {
      return identity;
    }
    return null;
  }, []);

  const applyNoSelfAudio = useCallback((room: Room) => {
    const myProfileId = myProfileIdRef.current;
    if (!myProfileId) return;

    room.remoteParticipants.forEach((participant) => {
      const profileId = extractProfileIdFromIdentity(participant.identity);
      if (!profileId || profileId !== myProfileId) return;

      participant.audioTrackPublications.forEach((publication: any) => {
        const track: any = publication?.track;
        if (!track) return;
        if (typeof track.setMuted === 'function') {
          track.setMuted(true);
          return;
        }
        if (typeof track.setVolume === 'function') {
          track.setVolume(0);
        }
      });
    });
  }, [extractProfileIdFromIdentity]);

  const [appState, setAppState] = useState(() => {
    try {
      return AppState.currentState;
    } catch {
      return 'active';
    }
  });

  // Refs to prevent reconnect on rerender
  const roomRef = useRef<Room | null>(null);
  const isConnectingRef = useRef(false);
  const hasConnectedRef = useRef(false);
  const reachedConnectedRef = useRef(false);
  const lastTokenStatusRef = useRef<number | null>(null);

  const livekitModuleRef = useRef<any>(null);

  const getLivekit = useCallback(() => {
    if (livekitModuleRef.current) return livekitModuleRef.current;
    // Ensure encoder/decoder globals exist before loading livekit-client under Hermes
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TextDecoder, TextEncoder } = require('text-encoding');
      if ((global as any).TextEncoder == null) (global as any).TextEncoder = TextEncoder;
      if ((global as any).TextDecoder == null) (global as any).TextDecoder = TextDecoder;
    } catch {
      // ignore
    }
    // Lazy-load so app boot doesn't evaluate livekit-client unless LiveRoom is entered.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    livekitModuleRef.current = require('livekit-client');
    return livekitModuleRef.current;
  }, []);

  // Selection engine state (persisted between renders for anti-thrash)
  const currentSelectionRef = useRef<string[]>([]);
  const [sortMode] = useState<SortMode>('random');
  
  // Stable random seed (persisted across app relaunches)
  // Initialize with in-memory default immediately
  const [randomSeed, setRandomSeed] = useState<number>(() => Math.floor(Date.now() / 1000));
  
  useEffect(() => {
    const loadOrCreateSeed = async () => {
      try {
        const stored = await SecureStore.getItemAsync('mylivelinks_random_seed');
        if (stored) {
          setRandomSeed(parseInt(stored, 10));
        } else {
          const newSeed = Math.floor(Date.now() / 1000);
          await SecureStore.setItemAsync('mylivelinks_random_seed', String(newSeed));
          setRandomSeed(newSeed);
        }
      } catch (error) {
        console.warn('[SEED] SecureStore unavailable, using in-memory seed:', error);
        // Already initialized with in-memory seed, no action needed
      }
    };
    loadOrCreateSeed();
  }, []);
  
  // Track first seen time per identity (stable joinedAt)
  const firstSeenTimestampRef = useRef<Map<string, number>>(new Map());

  /**
   * Fetch LiveKit token from server with device/session identifiers
   */
  const fetchToken = async (params: {
    participantName: string;
    canPublish: boolean;
    canSubscribe: boolean;
    role: 'viewer' | 'publisher';
    participantMetadata?: Record<string, any>;
  }): Promise<{ token: string; url: string }> => {
    try {
      tokenAttemptIdRef.current += 1;
      const attemptId = tokenAttemptIdRef.current;
      if (tokenAttemptInFlightRef.current != null) {
        console.log('[TOKEN] overlap_attempt', {
          attemptId,
          inFlightAttemptId: tokenAttemptInFlightRef.current,
        });
      }
      tokenAttemptInFlightRef.current = attemptId;

      setConnectionError(null);
      setTokenDebug({ endpoint: TOKEN_ENDPOINT, status: null, bodySnippet: null });
      setLastTokenError(null);
      setLastWsUrl(null);
      setLastConnectError(null);
      
      // Get stable device ID
      const deviceId = await getDeviceId();
      
      // Generate session ID for this connection
      const sessionId = generateSessionId();

      let accessToken = await getAccessToken();

      // Ensure token freshness (mobile must use Bearer token)
      // If token is missing OR session is expired/near-expiry, refresh session then re-check token.
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : null;
        const refreshSkewMs = 60_000;
        const isExpiredOrSoon = expiresAtMs != null && expiresAtMs <= Date.now() + refreshSkewMs;

        if (!accessToken || isExpiredOrSoon) {
          if (isExpiredOrSoon) {
            await supabase.auth.refreshSession();
          }
          accessToken = await getAccessToken();
          // Fallback: AuthContext state might not have updated yet; use session token if available.
          if (!accessToken) {
            const { data: refreshed } = await supabase.auth.getSession();
            accessToken = refreshed?.session?.access_token ?? null;
          }
        }
      } catch (err) {
        console.warn('[TOKEN] Session refresh check failed:', err);
        // Fall through; if we still don't have a token, we will hard-stop below.
      }

      // 1) Make Bearer token mandatory and blocking
      if (!accessToken) {
        lastTokenStatusRef.current = 0;
        setTokenDebug({ endpoint: TOKEN_ENDPOINT, status: 0, bodySnippet: null });
        setLastTokenError({
          status: 0,
          bodySnippet: '',
          message: 'No Supabase access token available on mobile',
        });
        setConnectionError('No Supabase access token available on mobile');
        throw new Error('No Supabase access token available on mobile');
      }

      console.log('[PARITY-PROOF] token_fetch_inputs', {
        EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
        TOKEN_ENDPOINT,
        ROOM_NAME,
        deviceType: 'mobile',
        deviceId,
        sessionId,
        identity: `u_${user?.id}:mobile:${deviceId}:${sessionId}`,
      });

      console.log('[PARITY-PROOF] token_fetch_request', {
        url: TOKEN_ENDPOINT,
        origin: (() => {
          try {
            return new URL(TOKEN_ENDPOINT).origin;
          } catch {
            return null;
          }
        })(),
        host: (() => {
          try {
            return new URL(TOKEN_ENDPOINT).host;
          } catch {
            return null;
          }
        })(),
      });

      if (DEBUG) {
        console.log('[TOKEN] Requesting token:', {
          participantName: params.participantName,
          deviceType: 'mobile',
          deviceId: deviceId.substring(0, 8) + '...',
          sessionId: sessionId.substring(0, 8) + '...',
          role: params.role,
          canPublish: params.canPublish,
          hasAccessToken: !!accessToken,
        });
      }

      // TEMP: Prove whether we actually have a token at the moment we send the request (do not log token)
      console.log('[TOKEN] hasAccessToken:', !!accessToken);

      const requestBody = {
        roomName: ROOM_NAME,
        participantName: params.participantName,
        canPublish: params.canPublish,
        canSubscribe: params.canSubscribe,
        deviceType: 'mobile',
        deviceId,
        sessionId,
        role: params.role,
        participantMetadata: params.participantMetadata,
      };

      // Ensure the modal never shows "no response" due to null status.
      lastTokenStatusRef.current = 0;
      setTokenDebug(prev => ({ ...prev, status: 0, bodySnippet: null }));
      setLastTokenError({ status: 0, bodySnippet: '', message: 'Token request in flight' });

      console.log('[TOKEN][HTTP] request', {
        endpoint: TOKEN_ENDPOINT,
        method: 'POST',
        bodyKeys: Object.keys(requestBody),
        headerKeys: ['Content-Type', 'Authorization'],
      });

      // Preflight reachability check (diagnostic) before token POST
      try {
        const reachabilityUrl = `${API_BASE_URL}/api/ping`;
        const t0 = nowMs();
        const preflightController = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const preflightTimeoutId = setTimeout(() => {
          try {
            preflightController?.abort();
          } catch {
            // ignore
          }
        }, 8_000);

        const preflightResponse = await fetch(reachabilityUrl, {
          method: 'GET',
          ...(preflightController ? { signal: preflightController.signal } : {}),
        }).finally(() => clearTimeout(preflightTimeoutId));

        const dt = Math.round(nowMs() - t0);
        const jsonSnippet = await preflightResponse.text().catch(() => '');
        console.log('[NET] reachability', {
          url: reachabilityUrl,
          method: 'GET',
          status: preflightResponse.status,
          ok: preflightResponse.ok,
          ms: dt,
          textSnippet: toSnippet(jsonSnippet, 200),
        });
      } catch (preflightErr: any) {
        const { name, message, cause } = getErrorDetails(preflightErr);
        console.log('[NET] reachability_error', {
          url: `${API_BASE_URL}/api/ping`,
          method: 'GET',
          name,
          message,
          cause,
        });
      }

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const tokenFetchStart = nowMs();
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      const isDevClient = isDev && Constants.appOwnership === 'standalone';
      const timeoutMs = isDevClient ? 45_000 : 15_000;

      console.log('[TOKEN] start', {
        attemptId,
        endpoint: TOKEN_ENDPOINT,
        timeoutMs,
        elapsedMs: 0,
      });
      const timeoutId = setTimeout(() => {
        try {
          const elapsedMs = Math.round(nowMs() - tokenFetchStart);
          console.log('[TOKEN] abort', {
            attemptId,
            endpoint: TOKEN_ENDPOINT,
            timeoutMs,
            elapsedMs,
          });
          controller?.abort();
        } catch {
          // ignore
        }
      }, timeoutMs);

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
        ...(controller ? { signal: controller.signal } : {}),
      }).finally(() => clearTimeout(timeoutId));

      const tokenFetchMs = Math.round(nowMs() - tokenFetchStart);

      const responseHeaders: Record<string, string> = {};
      try {
        (response.headers as any)?.forEach?.((value: string, key: string) => {
          responseHeaders[String(key).toLowerCase()] = String(value);
        });
      } catch {
        // ignore
      }

      console.log('[TOKEN] response_arrived', {
        attemptId,
        status: response.status,
        ok: response.ok,
        timeoutMs,
        elapsedMs: tokenFetchMs,
        responseUrl: (response as any)?.url ?? null,
        x_mll_token_route: responseHeaders['x-mll-token-route'] ?? null,
        x_mll_reqid: responseHeaders['x-mll-reqid'] ?? null,
      });

      lastTokenStatusRef.current = response.status;
      setTokenDebug(prev => ({ ...prev, status: response.status }));

      const responseTextRaw = await response.text().catch(() => '');
      const responseText = redactTokenFromText(responseTextRaw);
      const snippet500 = toSnippet(responseText, 500);
      console.log('[TOKEN][HTTP] response', {
        attemptId,
        status: response.status,
        ok: response.ok,
        timeoutMs,
        elapsedMs: tokenFetchMs,
        responseUrl: (response as any)?.url ?? null,
        headers: responseHeaders,
        textSnippet: snippet500,
      });

      if (!response.ok) {
        setTokenDebug(prev => ({ ...prev, bodySnippet: snippet500 }));

        setLastTokenError({
          status: response.status,
          bodySnippet: snippet500,
          message: `Token fetch failed: ${response.status}`,
        });

        let message = `Token fetch failed: ${response.status}`;
        if (response.status === 401 || response.status === 403) {
          message = 'Auth token missing/expired – Bearer token not being sent or Supabase session invalid';
          setLastTokenError({
            status: response.status,
            bodySnippet: snippet500,
            message,
          });
        }
        setConnectionError(message);
        throw new Error(message);
      }

      let data: any = null;
      try {
        data = JSON.parse(responseTextRaw);
      } catch (e: any) {
        setTokenDebug(prev => ({ ...prev, bodySnippet: snippet500 }));
        setLastTokenError({
          status: response.status,
          bodySnippet: snippet500,
          message: 'Token endpoint returned non-JSON response',
        });
        setConnectionError('Token endpoint returned non-JSON response');
        throw new Error(e?.message || 'Token endpoint returned non-JSON response');
      }

      setTokenDebug(prev => ({ ...prev, bodySnippet: snippet500 }));

      const wsUrl = typeof data?.url === 'string' ? String(data.url) : '';
      setLastWsUrl(wsUrl || null);

      if (!isValidWsUrl(wsUrl)) {
        const msg = `LIVEKIT_WS_URL missing/invalid (expected wss://...). Received: ${wsUrl || '(empty)'}`;
        setLastTokenError({
          status: response.status,
          bodySnippet: snippet500,
          message: msg,
        });
        setConnectionError(msg);
        throw new Error(msg);
      }
      
      if (DEBUG) {
        console.log('[TOKEN] Fetched successfully:', {
          urlPrefix: data.url?.substring(0, 30) + '...',
          tokenLength: data.token?.length,
          deviceType: 'mobile',
          deviceId: deviceId.substring(0, 8) + '...',
          sessionId: sessionId.substring(0, 8) + '...',
          role: 'viewer',
        });
      }

      return data;
    } catch (error: any) {
      const attemptId = tokenAttemptInFlightRef.current;
      const { name, message, cause } = getErrorDetails(error);
      const msg = message || 'Token fetch error';
      const stack = error?.stack ? String(error.stack).slice(0, 1200) : null;
      console.error('[TOKEN] Fetch error:', { attemptId, name, msg, cause, stack });

      const isAbort = name === 'AbortError' || msg === 'Aborted' || /aborted/i.test(msg);

      // 0 = no HTTP response (network/SSL/DNS failure)
      setTokenDebug(prev => ({ ...prev, status: prev.status ?? 0 }));
      if (lastTokenStatusRef.current == null) lastTokenStatusRef.current = 0;
      if (isAbort) {
        setConnectionError(prev => prev || 'Token fetch aborted (timeout)');
      } else {
        setConnectionError(prev => prev || 'Network/SSL error calling TOKEN_ENDPOINT');
      }
      setLastTokenError({
        status: lastTokenStatusRef.current ?? 0,
        bodySnippet: stack ? toSnippet(stack, 500) : '',
        message: msg,
      });
      throw error;
    } finally {
      tokenAttemptInFlightRef.current = null;
    }
  };

  const getAuthContext = useCallback(async () => {
    if (user?.id) {
      myProfileIdRef.current = user.id;
      return {
        isAuthed: true as const,
        profileId: user.id,
      };
    }

    // Anonymous viewer identity fallback (NOT used for hosting)
    const anonIdentity = await getMobileIdentity();
    myProfileIdRef.current = null;
    return {
      isAuthed: false as const,
      profileId: null,
      anonIdentity,
    };
  }, [user?.id]);

  /**
   * Map LiveKit participant to ParticipantLite for selection engine
   * Eligibility is derived from LiveKit only (hasVideo = publishing)
   */
  const toParticipantLite = useCallback((p: LiveKitParticipant): ParticipantLite => {
    const raw: any = p as any;
    const videoPublications = raw?.videoTrackPublications
      ? Array.from(raw.videoTrackPublications.values())
      : Array.from(raw?.trackPublications?.values?.() ?? []).filter((pub: any) => pub?.kind === 'video' || pub?.track?.kind === 'video');
    const audioPublications = raw?.audioTrackPublications
      ? Array.from(raw.audioTrackPublications.values())
      : Array.from(raw?.trackPublications?.values?.() ?? []).filter((pub: any) => pub?.kind === 'audio' || pub?.track?.kind === 'audio');

    const isSelf = myIdentity != null && p.identity === myIdentity;
    const hasVideo = isSelf
      ? videoPublications.some((pub: any) => !!pub?.track && !pub?.isMuted)
      : videoPublications.some((pub: any) => !!pub?.track && !!pub?.isSubscribed);
    const hasAudio = isSelf
      ? audioPublications.some((pub: any) => !!pub?.track && !pub?.isMuted)
      : audioPublications.some((pub: any) => !!pub?.track && !!pub?.isSubscribed);

    // Stable joinedAt: track first seen timestamp per identity
    let joinedAt: number;
    if (p.joinedAt) {
      joinedAt = p.joinedAt.getTime();
      // Cache it in case joinedAt becomes unavailable later
      if (!firstSeenTimestampRef.current.has(p.identity)) {
        firstSeenTimestampRef.current.set(p.identity, joinedAt);
      }
    } else {
      // Use cached timestamp if available, otherwise create stable one
      if (firstSeenTimestampRef.current.has(p.identity)) {
        joinedAt = firstSeenTimestampRef.current.get(p.identity)!;
      } else {
        joinedAt = Date.now();
        firstSeenTimestampRef.current.set(p.identity, joinedAt);
      }
    }

    return {
      identity: p.identity,
      hasVideo,
      hasAudio,
      joinedAt,
      isSelf,
      // Metrics not available from LiveKit - would come from Supabase if needed
      metrics: undefined,
    };
  }, [myIdentity]);

  /**
   * Update all participants list from room
   */
  const updateParticipants = useCallback((room: Room) => {
    const remoteParticipants = Array.from(room.remoteParticipants.values());
    const localParticipant = room.localParticipant;

    if (DEBUG) {
      for (const p of remoteParticipants) {
        const videoPubs = Array.from(p.videoTrackPublications.values());
        const hasVideo = videoPubs.some(pub => !!pub.track);
        const metadata = (p as any).metadata;
        console.log('[ROOM-AUDIT] remote_participant', {
          identity: p.identity,
          videoPublicationsCount: videoPubs.length,
          videoPublications: videoPubs.map(pub => ({
            trackSid: (pub as any).trackSid,
            isSubscribed: (pub as any).isSubscribed,
            hasTrack: !!pub.track,
          })),
          participantMetadataExists: !!metadata,
          hasVideo,
        });
      }
    }

    if (DEBUG) {
      console.log('[ROOM] All participants updated:', {
        count: remoteParticipants.length + (localParticipant ? 1 : 0),
        identities: [
          ...(localParticipant ? [localParticipant.identity.substring(0, 8) + '...'] : []),
          ...remoteParticipants.map(p => p.identity.substring(0, 8) + '...'),
        ],
      });
    }

    setAllParticipants([localParticipant, ...remoteParticipants].filter(Boolean) as LiveKitParticipant[]);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);

      if (nextState === 'active') return;

      try {
        if (roomRef.current) {
          if (DEBUG) {
            console.log('[ROOM] AppState disconnect', { nextState });
          }
          roomRef.current.disconnect();
          roomRef.current = null;
        }
      } catch {
        // ignore
      }

      setIsConnected(false);
      setAllParticipants([]);
      hasConnectedRef.current = false;
      isConnectingRef.current = false;
      reachedConnectedRef.current = false;
    });

    return () => {
      (sub as any)?.remove?.();
    };
  }, []);

  /**
   * Connect to LiveKit room (ONCE on mount)
   */
  useEffect(() => {
    // Guard: Only connect once
    if (hasConnectedRef.current || isConnectingRef.current) {
      if (DEBUG) {
        console.log('[ROOM] Skipping connect (already connecting/connected)');
      }
      return;
    }

    // Gate connection until explicitly enabled (after login/device/env ready)
    const enabledForConnect = enabled && appState === 'active';
    if (!enabledForConnect) {
      if (DEBUG) {
        console.log('[ROOM] Skipping connect (not enabled yet; wait for login/device/env)');
      }
      return;
    }

    isConnectingRef.current = true;

    const connectToRoom = async () => {
      try {
        reachedConnectedRef.current = false;
        setConnectDebug({ wsUrl: null, errorMessage: null, reachedConnected: false });
        const livekit = getLivekit();
        const RoomEvent = livekit.RoomEvent;
        const Track = livekit.Track;

        const authContext = await getAuthContext();
        if (!authContext.isAuthed || !authContext.profileId) {
          if (DEBUG) {
            console.log('[ROOM] Skipping connect (not authenticated)');
          }
          isConnectingRef.current = false;
          hasConnectedRef.current = false;
          return;
        }

        // 4) Guard against race conditions: do not attempt token fetch until AuthContext has a token.
        const bearer = await getAccessToken();
        if (!bearer) {
          lastTokenStatusRef.current = 0;
          setTokenDebug({ endpoint: TOKEN_ENDPOINT, status: 0, bodySnippet: null });
          setLastTokenError({
            status: 0,
            bodySnippet: '',
            message: 'No Supabase access token available on mobile',
          });
          setConnectionError('No Supabase access token available on mobile');
          isConnectingRef.current = false;
          hasConnectedRef.current = false;
          return;
        }
        const participantName = authContext.profileId;
        setMyIdentity(participantName);

        const publishEligible = canUserGoLive(user ? { id: user.id, email: user.email } : null);

        // Fetch token
        let token: string;
        let url: string;
        try {
          const tokenResult = await fetchToken({
            participantName,
            canPublish: publishEligible,
            canSubscribe: true,
            role: publishEligible ? 'publisher' : 'viewer',
            participantMetadata: authContext.isAuthed
              ? { profile_id: authContext.profileId, platform: 'mobile' }
              : { platform: 'mobile' },
          });
          token = tokenResult.token;
          url = tokenResult.url;
        } catch (tokenErr: any) {
          const { name, message, cause } = getErrorDetails(tokenErr);
          const details = [name, message, cause].filter(Boolean).join(' | ').slice(0, 500);
          console.error('[ROOM] Token fetch failed', { name, message, cause });
          setConnectDebug({ wsUrl: null, errorMessage: `TOKEN_FETCH_FAILED: ${details || 'Token fetch failed'}`, reachedConnected: false });
          setLastConnectError(`TOKEN_FETCH_FAILED: ${details || 'Token fetch failed'}`);
          isConnectingRef.current = false;
          hasConnectedRef.current = false;
          return;
        }

        if (DEBUG) console.log('[ROOM] Creating LiveKit Room instance');
        
        // Create room
        const room = new livekit.Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1920,
              height: 1080,
              frameRate: 30,
            },
          },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        roomRef.current = room;

        // Set up event listeners BEFORE connecting
        room.on(RoomEvent.Connected, () => {
          if (DEBUG) {
            console.log('[ROOM] Connected:', {
              room: ROOM_NAME,
              participantName,
              participants: room.remoteParticipants.size,
            });
          }
          setIsConnected(true);
          hasConnectedRef.current = true;
          isConnectingRef.current = false;
          reachedConnectedRef.current = true;
          setConnectDebug(prev => ({ ...prev, reachedConnected: true }));
          setConnectionError(null);
          applyNoSelfAudio(room);
          updateParticipants(room);
        });

        room.on(RoomEvent.Disconnected, (reason: unknown) => {
          if (DEBUG) {
            console.log('[ROOM] Disconnected:', reason);
          }
          setIsConnected(false);
          isConnectingRef.current = false;
          hasConnectedRef.current = false;
        });

        room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          if (DEBUG) {
            console.log('[SUB] Participant joined:', {
              id: participant.identity,
              name: participant.name,
              videoPubs: participant.videoTrackPublications.size,
              audioPubs: participant.audioTrackPublications.size,
            });
          }
          applyNoSelfAudio(room);
          updateParticipants(room);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          if (DEBUG) {
            console.log('[SUB] Participant left:', participant.identity);
          }
          updateParticipants(room);
        });

        room.on(RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
          if (track?.kind === Track.Kind.Video) {
            if (DEBUG) {
              console.log('[TRACK] Video subscribed:', {
                participant: participant.identity,
                trackSid: publication.trackSid,
              });
            }
            updateParticipants(room);
            return;
          }

          if (track?.kind === Track.Kind.Audio) {
            const myProfileId = myProfileIdRef.current;
            const participantProfileId = extractProfileIdFromIdentity(participant?.identity);

            if (myProfileId && participantProfileId && participantProfileId === myProfileId) {
              try {
                if (typeof track.setMuted === 'function') {
                  track.setMuted(true);
                } else if (typeof track.setVolume === 'function') {
                  track.setVolume(0);
                }
              } catch {
                // ignore
              }
            }
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: any, publication: any, participant: any) => {
          if (track?.kind === Track.Kind.Video) {
            if (DEBUG) {
              console.log('[TRACK] Video unsubscribed:', {
                participant: participant.identity,
                trackSid: publication.trackSid,
              });
            }
            updateParticipants(room);
          }
        });

        // Connect to room
        if (DEBUG) {
          console.log('[ROOM] Connecting to:', {
            url: url.substring(0, 30) + '...',
            room: ROOM_NAME,
            participantName,
          });
        }

        console.log('[PARITY-PROOF] room_connect_inputs', {
          url,
        });
        if (DEBUG) console.log('[ROOM] About to call room.connect()');
        setConnectDebug({ wsUrl: url, errorMessage: null, reachedConnected: false });
        try {
          await room.connect(url, token);
        } catch (err: any) {
          const details = [err?.name, err?.message, err?.stack].filter(Boolean).join(' | ').slice(0, 500);
          setConnectDebug(prev => ({ ...prev, wsUrl: url, errorMessage: details || 'WS connect failed' }));
          setLastConnectError(details || (err?.message || 'WS connect failed'));

          if (lastTokenStatusRef.current === 0) {
            setConnectionError('Network/SSL error calling TOKEN_ENDPOINT');
          } else {
            setConnectionError('WS connect failed (DNS/SSL/LIVEKIT_URL mismatch)');
          }
          throw err;
        }
        if (DEBUG) console.log('[ROOM] Connected successfully');

      } catch (error: any) {
        const { name, message, cause } = getErrorDetails(error);
        console.error('[ROOM] Room connect error', { name, message, cause });
        isConnectingRef.current = false;
        hasConnectedRef.current = false;
        if (!lastConnectError) {
          const details = [error?.name, error?.message, error?.stack].filter(Boolean).join(' | ').slice(0, 500);
          setLastConnectError(details || (error?.message || 'LiveKit room connection failed'));
        }
        if (!reachedConnectedRef.current) {
          setConnectDebug(prev => ({
            ...prev,
            reachedConnected: false,
            errorMessage: prev.errorMessage || (error?.message || 'LiveKit room connection failed').slice(0, 500),
          }));
          setConnectionError(prev => prev || (error?.message || 'LiveKit room connection failed'));
        }
      }
    };

    connectToRoom();
  }, [appState, enabled, getAccessToken, getAuthContext, updateParticipants, user?.email, user?.id]);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        if (DEBUG) {
          console.log('[ROOM] Cleaning up connection');
        }
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      hasConnectedRef.current = false;
      isConnectingRef.current = false;
      // Clear first seen timestamps on unmount
      firstSeenTimestampRef.current.clear();
    };
  }, []);

  /**
   * Use selection engine to determine which 12 participants to display
   * Maps LiveKit participants → ParticipantLite → selectGridParticipants → filtered list
   */
  const selectedParticipants = useMemo(() => {
    if (allParticipants.length === 0) return [];

    const localIdentity = myIdentity;

    // Map to ParticipantLite format
    const participantsLite = allParticipants.map(toParticipantLite);

    // Run selection engine
    const result = selectGridParticipants({
      participants: participantsLite,
      mode: sortMode,
      currentSelection: currentSelectionRef.current,
      seed: randomSeed,
      pinned: localIdentity ? [localIdentity] : [],
    });

    // Persist selection for next render (anti-thrash)
    currentSelectionRef.current = result.selection;

    if (DEBUG) {
      console.log('[SELECTION] Grid selection:', {
        total: participantsLite.length,
        eligible: result.debug?.eligibleCount,
        selected: result.selection.length,
        mode: sortMode,
        reason: result.debug?.reason,
      });
    }

    // Convert selected identities back to Participant objects
    const selectedIdentities = new Set(result.selection);
    const participants: Participant[] = allParticipants
      .filter(p => selectedIdentities.has(p.identity))
      .map(p => {
        const isLocal = localIdentity != null && p.identity === localIdentity;
        const raw: any = p as any;

        const videoPublications = raw?.videoTrackPublications
          ? Array.from(raw.videoTrackPublications.values())
          : Array.from(raw?.trackPublications?.values?.() ?? []).filter((pub: any) => pub?.kind === 'video' || pub?.track?.kind === 'video');
        const audioPublications = raw?.audioTrackPublications
          ? Array.from(raw.audioTrackPublications.values())
          : Array.from(raw?.trackPublications?.values?.() ?? []).filter((pub: any) => pub?.kind === 'audio' || pub?.track?.kind === 'audio');

        const hasVideo = isLocal
          ? videoPublications.some((pub: any) => !!pub?.track && !pub?.isMuted)
          : videoPublications.some((pub: any) => !!pub?.track && !!pub?.isSubscribed);
        const hasAudio = isLocal
          ? audioPublications.some((pub: any) => !!pub?.track && !pub?.isMuted)
          : audioPublications.some((pub: any) => !!pub?.track && !!pub?.isSubscribed);

        return {
          identity: p.identity,
          username: p.name || p.identity,
          isSpeaking: (p as any).isSpeaking,
          isCameraEnabled: hasVideo,
          isMicEnabled: hasAudio,
          isLocal,
          viewerCount: undefined, // Not available from LiveKit
        };
      });

    return participants;
  }, [allParticipants, toParticipantLite, sortMode, randomSeed, myIdentity]);

  const goLive = async () => {
    if (goLiveInFlightRef.current) return;
    if (isLiveRef.current) return;

    goLiveInFlightRef.current = true;
    try {
      const authContext = await getAuthContext();
      if (!authContext.isAuthed || !authContext.profileId) {
        throw new Error('Not authenticated');
      }

      // Check if already live elsewhere
      const { data: existingActiveStream } = await supabase
        .from('live_streams')
        .select('id, live_available')
        .eq('profile_id', authContext.profileId)
        .eq('live_available', true)
        .maybeSingle();

      if (existingActiveStream) {
        // Already live - return special error that UI can handle
        throw new Error('ALREADY_LIVE_ELSEWHERE');
      }

      const room = roomRef.current;
      if (!room || room.state !== 'connected') {
        throw new Error(connectionError || 'LiveKit room not connected');
      }

      setIsLive(true);
      isLiveRef.current = true;

      // Bring live_streams online (avoid upsert onConflict unless DB has a unique constraint)
      const startedAt = new Date().toISOString();
      const { data: existingRows, error: existingError } = await supabase
        .from('live_streams')
        .select('id')
        .eq('profile_id', authContext.profileId)
        .limit(10);

      if (existingError) {
        throw new Error(existingError?.message || 'Failed to check existing live stream');
      }

      const existingIds = (existingRows || [])
        .map((r: any) => r?.id)
        .filter((id: any) => id != null);

      const primaryId = existingIds.length > 0 ? existingIds[0] : null;
      let liveStreamId: string | number;

      if (primaryId) {
        const { data: updated, error: updateError } = await supabase
          .from('live_streams')
          .update({ live_available: true, started_at: startedAt, ended_at: null })
          .eq('id', primaryId)
          .select('id')
          .single();

        if (updateError || updated?.id == null) {
          throw new Error(updateError?.message || 'Failed to start live stream');
        }
        liveStreamId = updated.id;

        if (existingIds.length > 1) {
          try {
            await supabase
              .from('live_streams')
              .update({ live_available: false })
              .in('id', existingIds.slice(1));
          } catch {
            // ignore
          }
        }
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('live_streams')
          .insert({ profile_id: authContext.profileId, live_available: true, started_at: startedAt })
          .select('id')
          .single();

        if (insertError || inserted?.id == null) {
          throw new Error(insertError?.message || 'Failed to start live stream');
        }
        liveStreamId = inserted.id;
      }

      // Ensure user appears in slot 1 for themselves (same schema as web saveGridLayout)
      await supabase.from('user_grid_slots').delete().eq('viewer_id', authContext.profileId);
      await supabase.from('user_grid_slots').insert({
        viewer_id: authContext.profileId,
        slot_index: 1,
        streamer_id: authContext.profileId,
        live_stream_id: liveStreamId,
        is_pinned: false,
        is_muted: false,
        volume: 0.5,
      });

      // Update LiveKit participant metadata so webhook can identify streamer
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', authContext.profileId)
          .single();

        await room.localParticipant.setMetadata(
          JSON.stringify({
            profile_id: authContext.profileId,
            username: profile?.username || 'Anonymous',
            display_name: profile?.display_name || profile?.username || 'Anonymous',
            avatar_url: profile?.avatar_url || null,
            live_stream_id: liveStreamId,
            platform: 'mobile',
          })
        );
      } catch {
        // ignore
      }

      // Enable camera + mic (publishing)
      setIsPublishing(true);
      isPublishingRef.current = true;
      try {
        // Enable camera with optimal quality settings
        await room.localParticipant.setCameraEnabled(true, {
          resolution: {
            width: 1920,
            height: 1080,
            frameRate: 30,
          },
        });
        
        // Enable microphone with audio optimizations
        await room.localParticipant.setMicrophoneEnabled(true);

        // Force a state refresh so the memoized selection sees the updated local track publications.
        updateParticipants(room);

        if (DEBUG) {
          const pubs = Array.from(room.localParticipant.trackPublications.values()).map((pub: any) => ({
            source: pub.source,
            kind: pub.kind,
            trackSid: pub.trackSid,
            isMuted: pub.isMuted,
            hasTrack: !!pub.track,
          }));
          console.log('[PUBLISH-AUDIT][MOBILE] local_publish_state', {
            roomState: room.state,
            localParticipantSid: room.localParticipant.sid,
            localParticipantIdentity: room.localParticipant.identity,
            canPublish: room.localParticipant.permissions?.canPublish,
            canSubscribe: room.localParticipant.permissions?.canSubscribe,
            publicationsCount: room.localParticipant.trackPublications.size,
            publications: pubs,
          });
        }
      } catch (err: any) {
        setIsPublishing(false);
        isPublishingRef.current = false;
        throw new Error(err?.message || 'Failed to publish');
      }
    } catch (err) {
      // rollback local state on failure
      setIsLive(false);
      setIsPublishing(false);
      isLiveRef.current = false;
      isPublishingRef.current = false;
      throw err;
    } finally {
      goLiveInFlightRef.current = false;
    }
  };

  const stopLive = async () => {
    if (stopLiveInFlightRef.current) return;
    if (!isLiveRef.current) return;

    stopLiveInFlightRef.current = true;
    try {
      const authContext = await getAuthContext();
      if (!authContext.isAuthed || !authContext.profileId) {
        throw new Error('Not authenticated');
      }

      const room = roomRef.current;
      if (room && room.state === 'connected') {
        try {
          await room.localParticipant.setCameraEnabled(false);
          await room.localParticipant.setMicrophoneEnabled(false);
        } catch {
          // ignore
        }
      }

      // Update DB state first
      await supabase
        .from('live_streams')
        .update({ live_available: false, ended_at: new Date().toISOString() })
        .eq('profile_id', authContext.profileId);

      await supabase.from('user_grid_slots').delete().eq('streamer_id', authContext.profileId);

      // Service-role cleanup (same endpoint as web)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || null;
        const cleanupUrl = process.env.EXPO_PUBLIC_API_URL
          ? `${process.env.EXPO_PUBLIC_API_URL}/api/stream-cleanup`
          : 'https://www.mylivelinks.com/api/stream-cleanup';

        await fetch(cleanupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ action: 'end_stream', reason: 'mobile_stop_button' }),
        });
      } catch {
        // ignore
      }
    } finally {
      setIsPublishing(false);
      setIsLive(false);
      isPublishingRef.current = false;
      isLiveRef.current = false;
      stopLiveInFlightRef.current = false;
    }
  };

  // Helper: End stream on other device
  const endOtherStream = async () => {
    try {
      const authContext = await getAuthContext();
      if (!authContext.isAuthed || !authContext.profileId) {
        throw new Error('Not authenticated');
      }

      // End the existing stream
      await supabase
        .from('live_streams')
        .update({ live_available: false, ended_at: new Date().toISOString() })
        .eq('profile_id', authContext.profileId);

      // Remove from grid slots
      await supabase.from('user_grid_slots').delete().eq('streamer_id', authContext.profileId);

      // Call cleanup API
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || null;
        const cleanupUrl = process.env.EXPO_PUBLIC_API_URL
          ? `${process.env.EXPO_PUBLIC_API_URL}/api/stream-cleanup`
          : 'https://www.mylivelinks.com/api/stream-cleanup';

        await fetch(cleanupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ action: 'end_stream', reason: 'device_switch' }),
        });
      } catch {
        // ignore
      }

      // Wait for cleanup to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      throw new Error('Failed to end stream on other device');
    }
  };

  // Helper: Resume stream on this device
  const resumeOnThisDevice = async () => {
    try {
      const authContext = await getAuthContext();
      if (!authContext.isAuthed || !authContext.profileId) {
        throw new Error('Not authenticated');
      }

      // Get the existing stream ID
      const { data: existingStream } = await supabase
        .from('live_streams')
        .select('id')
        .eq('profile_id', authContext.profileId)
        .eq('live_available', true)
        .single();

      if (!existingStream) {
        throw new Error('No active stream found');
      }

      const room = roomRef.current;
      if (!room || room.state !== 'connected') {
        throw new Error(connectionError || 'LiveKit room not connected');
      }

      // Set the stream as active locally
      setIsLive(true);
      isLiveRef.current = true;

      // Update LiveKit participant metadata
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', authContext.profileId)
          .single();

        await room.localParticipant.setMetadata(
          JSON.stringify({
            profile_id: authContext.profileId,
            username: profile?.username || 'Anonymous',
            display_name: profile?.display_name || profile?.username || 'Anonymous',
            avatar_url: profile?.avatar_url || null,
            live_stream_id: existingStream.id,
            platform: 'mobile',
          })
        );
      } catch {
        // ignore
      }

      // Enable camera + mic (publishing)
      setIsPublishing(true);
      isPublishingRef.current = true;
      try {
        await room.localParticipant.setCameraEnabled(true, {
          resolution: {
            width: 1920,
            height: 1080,
            frameRate: 30,
          },
        });
        
        await room.localParticipant.setMicrophoneEnabled(true);
        updateParticipants(room);
      } catch (err: any) {
        setIsPublishing(false);
        isPublishingRef.current = false;
        throw new Error(err?.message || 'Failed to publish');
      }
    } catch (err) {
      // rollback local state on failure
      setIsLive(false);
      setIsPublishing(false);
      isLiveRef.current = false;
      isPublishingRef.current = false;
      throw err;
    }
  };

  return {
    participants: selectedParticipants,
    myIdentity,
    isConnected,
    goLive,
    stopLive,
    endOtherStream,
    resumeOnThisDevice,
    isLive,
    isPublishing,
    tileCount: selectedParticipants.length,
    room: roomRef.current,
    connectionError,
    tokenDebug,
    connectDebug: {
      ...connectDebug,
      reachedConnected: connectDebug.reachedConnected || reachedConnectedRef.current,
    },
    lastTokenEndpoint: TOKEN_ENDPOINT,
    lastTokenError,
    lastWsUrl,
    lastConnectError,
  };
}
