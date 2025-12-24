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
import { Room, RoomEvent, RemoteParticipant, Track } from 'livekit-client';
import type { Participant } from '../types/live';
import { getMobileIdentity } from '../lib/mobileIdentity';
import { getDeviceId, generateSessionId } from '../lib/deviceId';
import { selectGridParticipants, type ParticipantLite, type SortMode } from '../lib/live';

import { LIVEKIT_ROOM_NAME, TOKEN_ENDPOINT_PATH, DEBUG_LIVEKIT } from '../lib/livekit-constants';

const DEBUG = DEBUG_LIVEKIT;
const ROOM_NAME = LIVEKIT_ROOM_NAME; // Imported from shared constants
const TOKEN_ENDPOINT = process.env.EXPO_PUBLIC_API_URL 
  ? `${process.env.EXPO_PUBLIC_API_URL}${TOKEN_ENDPOINT_PATH}`
  : `https://mylivelinks.com${TOKEN_ENDPOINT_PATH}`; // Default to production

interface UseLiveRoomParticipantsReturn {
  participants: Participant[];
  myIdentity: string | null;
  isConnected: boolean;
  goLive: () => Promise<void>;
  stopLive: () => Promise<void>;
  tileCount: number;
  room: Room | null;
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
  console.log('[ROOM] useLiveRoomParticipants invoked');
  
  const { enabled = true } = options;
  const [allParticipants, setAllParticipants] = useState<RemoteParticipant[]>([]);
  const [myIdentity, setMyIdentity] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs to prevent reconnect on rerender
  const roomRef = useRef<Room | null>(null);
  const isConnectingRef = useRef(false);
  const hasConnectedRef = useRef(false);

  // Selection engine state (persisted between renders for anti-thrash)
  const currentSelectionRef = useRef<string[]>([]);
  const [sortMode] = useState<SortMode>('random');
  
  // Stable random seed (persisted across app relaunches)
  // Initialize with in-memory default immediately
  const [randomSeed, setRandomSeed] = useState<number>(() => Math.floor(Date.now() / 1000));
  
  useEffect(() => {
    const loadOrCreateSeed = async () => {
      try {
        const SecureStore = await import('expo-secure-store');
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
  const fetchToken = async (identity: string): Promise<{ token: string; url: string }> => {
    try {
      // Get stable device ID
      const deviceId = await getDeviceId();
      
      // Generate session ID for this connection
      const sessionId = generateSessionId();

      if (DEBUG) {
        console.log('[TOKEN] Requesting token:', {
          identity: identity.substring(0, 8) + '...',
          deviceType: 'mobile',
          deviceId: deviceId.substring(0, 8) + '...',
          sessionId: sessionId.substring(0, 8) + '...',
          role: 'viewer',
        });
      }

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: For mobile anonymous viewers, we may need to handle auth differently
          // For now, let's try without auth token (server should allow anonymous viewing)
        },
        body: JSON.stringify({
          roomName: ROOM_NAME,
          userId: identity, // Use mobile identity as userId
          displayName: 'Mobile User',
          deviceType: 'mobile',
          deviceId,
          sessionId,
          role: 'viewer',
          // Legacy fields for backwards compatibility
          participantName: 'Mobile User',
          canPublish: false,
          canSubscribe: true,
          participantMetadata: {
            platform: 'mobile',
            deviceType: 'mobile',
            deviceId,
            sessionId,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Token fetch failed: ${response.status}`);
      }

      const data = await response.json();
      
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
      console.error('[TOKEN] Fetch error:', error.message);
      throw error;
    }
  };

  /**
   * Map LiveKit participant to ParticipantLite for selection engine
   * Eligibility is derived from LiveKit only (hasVideo = publishing)
   */
  const toParticipantLite = useCallback((p: RemoteParticipant): ParticipantLite => {
    const hasVideo = Array.from(p.videoTrackPublications.values()).some(pub => pub.track);
    const hasAudio = Array.from(p.audioTrackPublications.values()).some(pub => pub.track);

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
      isSelf: false,
      // Metrics not available from LiveKit - would come from Supabase if needed
      metrics: undefined,
    };
  }, []);

  /**
   * Update all participants list from room
   */
  const updateParticipants = useCallback((room: Room) => {
    const remoteParticipants = Array.from(room.remoteParticipants.values());

    if (DEBUG) {
      console.log('[ROOM] All participants updated:', {
        count: remoteParticipants.length,
        identities: remoteParticipants.map(p => p.identity.substring(0, 8) + '...'),
      });
    }

    setAllParticipants(remoteParticipants);
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
    if (!enabled) {
      if (DEBUG) {
        console.log('[ROOM] Skipping connect (not enabled yet; wait for login/device/env)');
      }
      return;
    }

    // Ensure env is present
    if (!TOKEN_ENDPOINT) {
      if (DEBUG) {
        console.log('[ROOM] Skipping connect (missing TOKEN_ENDPOINT / API URL)');
      }
      return;
    }

    isConnectingRef.current = true;

    const connectToRoom = async () => {
      try {
        // Get or create stable mobile identity
        const identity = await getMobileIdentity();
        setMyIdentity(identity);

        // Fetch token
        const { token, url } = await fetchToken(identity);

        console.log('[ROOM] Creating LiveKit Room instance');
        
        // Create room
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
        });

        roomRef.current = room;

        // Set up event listeners BEFORE connecting
        room.on(RoomEvent.Connected, () => {
          if (DEBUG) {
            console.log('[ROOM] Connected:', {
              room: ROOM_NAME,
              identity,
              participants: room.remoteParticipants.size,
            });
          }
          setIsConnected(true);
          hasConnectedRef.current = true;
          updateParticipants(room);
        });

        room.on(RoomEvent.Disconnected, (reason) => {
          if (DEBUG) {
            console.log('[ROOM] Disconnected:', reason);
          }
          setIsConnected(false);
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
          updateParticipants(room);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          if (DEBUG) {
            console.log('[SUB] Participant left:', participant.identity);
          }
          updateParticipants(room);
        });

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Video) {
            if (DEBUG) {
              console.log('[TRACK] Video subscribed:', {
                participant: participant.identity,
                trackSid: publication.trackSid,
              });
            }
            updateParticipants(room);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Video) {
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
            identity,
          });
        }

        console.log('[ROOM] About to call room.connect()');
        await room.connect(url, token);
        console.log('[ROOM] Connected successfully');

      } catch (error: any) {
        console.error('[ROOM] Connection error', error);
        isConnectingRef.current = false;
        hasConnectedRef.current = false;
      }
    };

    connectToRoom();

    // Cleanup on unmount
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
  }, []); // Empty deps - connect ONCE on mount

  /**
   * Use selection engine to determine which 12 participants to display
   * Maps LiveKit participants → ParticipantLite → selectGridParticipants → filtered list
   */
  const selectedParticipants = useMemo(() => {
    if (allParticipants.length === 0) return [];

    // Map to ParticipantLite format
    const participantsLite = allParticipants.map(toParticipantLite);

    // Run selection engine
    const result = selectGridParticipants({
      participants: participantsLite,
      mode: sortMode,
      currentSelection: currentSelectionRef.current,
      seed: randomSeed,
      pinned: [], // No pinning in mobile for now
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
        const hasVideo = Array.from(p.videoTrackPublications.values()).some(pub => pub.isSubscribed);
        const hasAudio = Array.from(p.audioTrackPublications.values()).some(pub => pub.isSubscribed);

        return {
          identity: p.identity,
          username: p.name || p.identity,
          isSpeaking: p.isSpeaking,
          isCameraEnabled: hasVideo,
          isMicEnabled: hasAudio,
          isLocal: false,
          viewerCount: undefined, // Not available from LiveKit
        };
      });

    return participants;
  }, [allParticipants, toParticipantLite, sortMode, randomSeed]);

  const goLive = async () => {
    // Not implemented for mobile viewers
    console.warn('[ROOM] goLive() not implemented for mobile viewers');
  };

  const stopLive = async () => {
    // Not implemented for mobile viewers
    console.warn('[ROOM] stopLive() not implemented for mobile viewers');
  };

  return {
    participants: selectedParticipants,
    myIdentity,
    isConnected,
    goLive,
    stopLive,
    tileCount: selectedParticipants.length,
    room: roomRef.current,
  };
}
