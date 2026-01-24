'use client';

/**
 * BattleGridWrapper - Handles LiveKit connection and renders MultiHostGrid
 * 
 * Used by both host and viewer pages when a battle/cohost session is active.
 * Manages:
 * - LiveKit room connection to battle_<id> or cohost_<id>
 * - Track subscription/publishing
 * - Participant mapping to grid
 * - Timer display
 * 
 * CRITICAL: VIEWER SEPARATION
 * Viewers join with identities containing `:unknown:` or `:viewer:`.
 * They MUST be filtered out at EVERY point where participants are processed:
 * 1. updateParticipants() - filters remote participants BEFORE any processing
 * 2. ParticipantConnected event - early return before any state update
 * 3. ParticipantDisconnected event - early return before any state update
 * 4. TrackSubscribed event - early return before triggering updates
 * 5. TrackUnsubscribed event - early return before triggering updates
 * 6. Hydration polling - count filter to exclude viewers
 * 7. Volume/mute controls - filter before processing
 * 
 * Viewers should NEVER trigger grid updates or appear in the battle grid.
 * Any viewer action should be completely invisible to the hosts.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Room, 
  RoomEvent, 
  Track, 
  RemoteTrack, 
  RemoteParticipant, 
  LocalParticipant,
  TrackPublication,
  LocalTrackPublication,
  VideoPresets,
  createLocalTracks,
} from 'livekit-client';
import { TOKEN_ENDPOINT } from '@/lib/livekit-constants';
import { LiveSession, getSessionRoomName, startBattleReady, setBattleReady } from '@/lib/battle-session';
import MultiHostGrid, { ParticipantVolume, GridMode } from './MultiHostGrid';
import { GridTileParticipant } from './GridTile';
import BattleTimer from './BattleTimer';
import BattleScoreSlider from './BattleScoreSlider';
import BattleTileOverlay, {
  BattleParticipantState,
  BattleMode,
  TEAM_COLORS,
} from './BattleTileOverlay';
import BattleCooldownControls from './BattleCooldownControls';
import BoostRoundIndicator from './BoostRoundIndicator';
import CohostStartBattleButton from './CohostStartBattleButton';
import BattleInvitePopup from './BattleInvitePopup';
import BattleReadyModal from './BattleReadyModal';
import useBattleScores from '@/hooks/useBattleScores';
import TopGiftersDisplay, { TeamTopGifter } from './TopGiftersDisplay';
import { createClient } from '@/lib/supabase';

const normalizeParticipantId = (identity: string): string => {
  return identity
    .replace(/^(u_|guest_)/i, '')
    .split(':')[0]
    .trim();
};

// Determine if an identity represents a battle grid participant (host)
// Excludes viewers but allows host identities even if they contain ":unknown:" in metadata
// CRITICAL: Viewers should have identities starting with "viewer_" or containing ":viewer:"
// Note: ":unknown:" in the middle of an identity (e.g., "u_xxx:web:unknown:timestamp") is just metadata
// and doesn't mean the participant is a viewer - only exclude if it starts with "viewer_"
const isBattleGridIdentity = (identity: string): boolean => {
  // Explicitly exclude viewer identities
  if (identity.startsWith('viewer_')) return false;
  if (identity.includes(':viewer:')) return false;
  // Host identities should start with "u_" (user) or "guest_" (guest host)
  // Allow even if they contain ":unknown:" in metadata (e.g., "u_xxx:web:unknown:timestamp")
  return identity.startsWith('u_') || identity.startsWith('guest_');
};

interface BattleGridWrapperProps {
  /** Active session data */
  session: LiveSession;
  /** Current user's profile ID */
  currentUserId: string;
  /** Current user's display name */
  currentUserName: string;
  /** Whether current user should publish (hosts only) */
  canPublish: boolean;
  /** For viewers: the profile ID of the host they're watching (to show that host first) */
  targetHostId?: string;
  /** Remaining seconds in current phase */
  remainingSeconds: number;
  /** Additional className for wrapper */
  className?: string;
  /** Callback when room connects */
  onRoomConnected?: () => void;
  /** Callback when room disconnects */
  onRoomDisconnected?: () => void;
  /** Callback when we detect an unknown participant - triggers session refresh */
  onRefreshSession?: () => void;
}

export default function BattleGridWrapper({
  session,
  currentUserId,
  currentUserName,
  canPublish,
  targetHostId,
  remainingSeconds,
  className = '',
  onRoomConnected,
  onRoomDisconnected,
  onRefreshSession,
}: BattleGridWrapperProps) {
  // ============================================================================
  // ALL HOOKS MUST BE CALLED FIRST - NO early returns before hooks!
  // ============================================================================
  const [participants, setParticipants] = useState<GridTileParticipant[]>([]);
  const [volumes, setVolumes] = useState<ParticipantVolume[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [participantsReady, setParticipantsReady] = useState(false);
  const [allowEmptyState, setAllowEmptyState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const [settingReady, setSettingReady] = useState(false);
  const [battleInvite, setBattleInvite] = useState<{
    id: string;
    fromUsername: string;
  } | null>(null);

  const lastRefreshRequestRef = useRef<number>(0);
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<{ video: any; audio: any }>({ video: null, audio: null });
  const emptyStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hydrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = useMemo(() => createClient(), []);
  
  // Debounce scheduler for updateParticipants
  const pendingUpdateRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  
  // Track participants in ref to check in callbacks
  const participantsRef = useRef<GridTileParticipant[]>([]);
  
  // ============================================================================
  // NOW SAFE: Derived constants from session (all hooks declared above)
  // Use optional chaining for all session access
  // ============================================================================
  const isBattleSession = session?.type === 'battle';
  const isCohostSession = session?.type === 'cohost';
  const isInCooldown = session?.status === 'cooldown';
  const isBattleReady = session?.status === 'battle_ready';
  const isBattleActive = session?.status === 'battle_active' || session?.status === 'active';
  
  // Ready states for battle_ready phase - ensure it's a plain object
  const readyStates = (session?.ready_states && typeof session.ready_states === 'object' && !Array.isArray(session.ready_states)) 
    ? session.ready_states as Record<string, boolean>
    : {};
  const isCurrentUserReady = currentUserId ? (readyStates[currentUserId] === true) : false;
  
  // Battle scores hook (only for battle sessions) - also safe now as all previous hooks are declared
  const { scores, refresh: refreshScores, awardChatPoints } = useBattleScores({
    sessionId: (isBattleSession && session) ? session.session_id : null,
    autoFetch: isBattleSession,
  });
  
  // Force refresh scores when battle status changes (ready or active)
  const prevBattleStatusRef = useRef<string | null>(null);
  useEffect(() => {
    // Always run effect but only refresh in battle sessions
    const currentStatus = session?.status || null;
    const prevStatus = prevBattleStatusRef.current;
    
    // Only refresh if: it's a battle session AND status changed to battle_ready or battle_active
    if (isBattleSession && session && prevStatus !== currentStatus && 
        (currentStatus === 'battle_ready' || currentStatus === 'battle_active')) {
      console.log('[BattleGridWrapper] Battle status changed to', currentStatus, '- refreshing scores');
      refreshScores?.();
    }
    
    prevBattleStatusRef.current = currentStatus;
  }, [isBattleSession, session?.status, refreshScores]);
  
  // CRITICAL: Use stable room name - only change when session_id or type actually changes
  // Don't recreate on every session object update (status changes, timer updates, etc.)
  const roomName = useMemo(() => {
    if (!session) return null;
    return getSessionRoomName(session.session_id, session.type);
  }, [session?.session_id, session?.type]);
  
  // Track the actual room we're connected to (stable reference)
  const connectedRoomNameRef = useRef<string | null>(null);

  // Simplified: Always use participants array for all grid operations
  // CRITICAL: Only depend on identity fields, not status/timers/other metadata
  const hostSnapshot = useMemo(() => {
    if (!session) return null;
    
    console.log('[BattleGridWrapper] Building hostSnapshot from session:', {
      session_id: session.session_id,
      type: session.type,
      status: session.status,
      participants: session.participants,
      host_a: session.host_a,
      host_b: session.host_b,
    });
    
    // ALWAYS use participants array (unified approach for 1-9 hosts)
    const rawParticipants = (session.participants && Array.isArray(session.participants) && session.participants.length > 0)
      ? session.participants as Array<{
          profile_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          team: string;
          slot_index: number;
        }>
      : [];
    
    console.log('[BattleGridWrapper] Raw participants from session:', rawParticipants);
    
    // Map to normalized format with 'id' instead of 'profile_id'
    const participantList = rawParticipants
      .map(p => ({
        id: p.profile_id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        team: p.team,
        slot_index: p.slot_index,
      }))
      .sort((a, b) => a.slot_index - b.slot_index); // Ensure consistent ordering by slot
    
    console.log('[BattleGridWrapper] Mapped and sorted participants:', participantList);
    
    return {
      participants: participantList,
      type: session.type,
      session_id: session.session_id,
    };
  }, [
    // CRITICAL: Only depend on identity fields that affect room connection
    // Exclude: status, ends_at, cooldown_ends_at, ready_states, etc.
    session?.participants,
    session?.type,
    session?.session_id,
  ]);

  // Prepare participants data for ready modal
  const modalParticipants = useMemo(() => {
    if (!hostSnapshot || !hostSnapshot.participants) return [];
    
    return hostSnapshot.participants.map(p => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name || undefined,
      avatarUrl: p.avatar_url || undefined,
    }));
  }, [hostSnapshot]);

  const battleMode: BattleMode = 'duel';

  // Dynamic grid sizing based on participant count
  // Primary driver is maxSlots; mode is derived to match
  const { gridMaxSlots, gridMode } = useMemo((): { gridMaxSlots: 2 | 4 | 9; gridMode: GridMode } => {
    const count = participants.length;
    if (count <= 2) {
      return { gridMaxSlots: 2, gridMode: 'duo' };
    } else if (count <= 4) {
      return { gridMaxSlots: 4, gridMode: 'squad' };
    } else {
      return { gridMaxSlots: 9, gridMode: 'ffa' };
    }
  }, [participants.length]);

  // Derive top 3 gifters from scores.supporters (all teams combined for 3+ battles)
  const topGifters = useMemo((): TeamTopGifter[] => {
    if (!scores?.supporters || scores.supporters.length === 0) {
      console.log('[BattleGrid] No supporters data:', { scores });
      return [];
    }

    const mapToGifter = (s: typeof scores.supporters[0], rank: 1 | 2 | 3): TeamTopGifter => ({
      profile_id: s.profile_id,
      username: s.username,
      display_name: s.display_name,
      avatar_url: s.avatar_url,
      points_contributed: s.points_contributed,
      rank,
    });

    // Get top 3 gifters across ALL teams
    const result = scores.supporters
      .sort((a, b) => b.points_contributed - a.points_contributed)
      .slice(0, 3)
      .map((s, i) => mapToGifter(s, (i + 1) as 1 | 2 | 3));
    
    console.log('[BattleGrid] Top gifters:', result);
    return result;
  }, [scores?.supporters]);

  // Battle states with real scores and team-relative colors
  const battleStates = useMemo(() => {
    if (!isBattleSession || !hostSnapshot || !hostSnapshot.participants) {
      return new Map<string, BattleParticipantState>();
    }

    const states = new Map<string, BattleParticipantState>();
    const allParticipants = hostSnapshot.participants;
    
    // For 1v1 (2 people): traditional team A vs B logic
    if (allParticipants.length === 2) {
      const hostA = allParticipants[0];
      const hostB = allParticipants[1];
      const isCurrentUserHostA = currentUserId === hostA?.id;
      
      // Team-relative color assignment for current user
      const currentUserColor = isCurrentUserHostA ? TEAM_COLORS.A : TEAM_COLORS.B;
      const otherUserColor = isCurrentUserHostA ? TEAM_COLORS.B : TEAM_COLORS.A;
      
      const scoreA = scores?.points.A || 0;
      const scoreB = scores?.points.B || 0;
      const isALeading = scoreA >= scoreB;

      // Current user state
      states.set(currentUserId, {
        participantId: currentUserId,
        score: isCurrentUserHostA ? scoreA : scoreB,
        color: currentUserColor,
        teamId: isCurrentUserHostA ? 'A' : 'B',
        rank: isCurrentUserHostA ? (isALeading ? 1 : 2) : (isALeading ? 2 : 1),
        isLeading: isCurrentUserHostA ? isALeading : !isALeading,
      });

      // Other host state
      const otherHostId = isCurrentUserHostA ? hostB?.id : hostA?.id;
      if (otherHostId) {
        states.set(otherHostId, {
          participantId: otherHostId,
          score: isCurrentUserHostA ? scoreB : scoreA,
          color: otherUserColor,
          teamId: isCurrentUserHostA ? 'B' : 'A',
          rank: isCurrentUserHostA ? (isALeading ? 2 : 1) : (isALeading ? 1 : 2),
          isLeading: isCurrentUserHostA ? !isALeading : isALeading,
        });
      }
    } else {
      // For 3+ people: free-for-all with individual scores
      allParticipants.forEach((p, index) => {
        const teamId = p.team || String.fromCharCode(65 + index); // A, B, C, D, etc.
        const score = (scores?.points as any)?.[teamId] || 0;
        
        states.set(p.id, {
          participantId: p.id,
          score,
          color: TEAM_COLORS[teamId as keyof typeof TEAM_COLORS] || TEAM_COLORS.A,
          teamId,
          rank: 1, // TODO: calculate rank based on scores
          isLeading: false, // TODO: determine if leading
        });
      });
    }

    return states;
  }, [hostSnapshot?.participants, currentUserId, isBattleSession, scores]);

  const renderBattleOverlay = useCallback(
    (participant: GridTileParticipant) => {
      // During active battle, show battle overlay (NOT during battle_ready - that uses modal)
      if (!isBattleSession || !isBattleActive) return null;
      const state = battleStates.get(participant.id);
      if (!state) return null;

      return (
        <BattleTileOverlay
          participantId={participant.id}
          battleState={state}
          battleMode={battleMode}
          compact={participants.length > 2}
        />
      );
    },
    [battleStates, battleMode, isBattleSession, isBattleActive, participants.length]
  );
  
  // Map LiveKit participants to grid participants
  const updateParticipants = useCallback((reason?: string) => {
    const room = roomRef.current;
    if (!room || !hostSnapshot) {
      console.log('[LiveKit][Battle] updateParticipants skipped:', { hasRoom: !!room, hasHostSnapshot: !!hostSnapshot, reason });
      return;
    }
    
    // NOTE: We don't early return here for viewers in battle_ready because we need to allow
    // updateParticipants to run normally to find participants. The preservation logic below
    // will handle preventing state changes if needed.
    
    if (reason) {
      console.log('[LiveKit][Battle] updateParticipants:', reason);
    }
    
    console.log('[LiveKit][Battle] Current state:', {
      roomState: room.state,
      remoteParticipantsCount: room.remoteParticipants.size,
      sessionParticipants: hostSnapshot.participants.map(p => ({ id: p.id, username: p.username, slot: p.slot_index })),
      remoteParticipantIdentities: Array.from(room.remoteParticipants.values()).map(p => ({
        identity: p.identity,
        normalized: normalizeParticipantId(p.identity),
        trackCount: p.trackPublications.size,
      })),
    });
    
    const gridParticipants: GridTileParticipant[] = [];
    
    // Add local participant if publishing - ALWAYS add when canPublish is true
    const local = room.localParticipant;
    if (local && canPublish) {
      const videoTrack = local.getTrackPublication(Track.Source.Camera)?.track;
      const audioTrack = local.getTrackPublication(Track.Source.Microphone)?.track;
      
      // Find current user in participants array
      const currentUserInfo = hostSnapshot.participants?.find(p => p.id === currentUserId);
      const displayName = currentUserInfo?.display_name || currentUserInfo?.username || currentUserName;
      const avatarUrl = currentUserInfo?.avatar_url || undefined;
      
      // Always add local participant to grid when publishing
      gridParticipants.push({
        id: currentUserId,
        name: displayName,
        videoTrack: videoTrack || undefined,
        audioTrack: audioTrack || undefined,
        isHost: true, // Current user is always "host" for their own view
        avatarUrl: avatarUrl,
      });
    }
    
    // Add remote participants - ONLY if they are hostA or hostB (invited hosts only)
    room.remoteParticipants.forEach((participant) => {
      // Extract user ID from identity (format: u_<uuid>[:device], guest_<uuid>[:device])
      const identity = participant.identity;
      
      // CRITICAL: Filter out viewers and unknown participants FIRST - they should NEVER be in the grid
      if (!isBattleGridIdentity(identity)) {
        return; // Skip viewers/unknown, they should NEVER affect the battle grid
      }
      
      const userId = normalizeParticipantId(identity);
      
      // Find participant info from session
      const participantInfo = hostSnapshot.participants?.find(p => p.id === userId);
      
      // For cohost sessions, if we see a participant not in our snapshot, add temporarily and trigger refresh
      if (!participantInfo && isCohostSession) {
        console.log('[LiveKit][Battle] Detected new cohost participant not in snapshot:', userId);
        
        // Trigger session refresh
        if (onRefreshSession) {
          const now = Date.now();
          if (now - lastRefreshRequestRef.current > 3000) {
            lastRefreshRequestRef.current = now;
            onRefreshSession();
          }
        }
        
        // Add with minimal info temporarily
        const videoTrack = Array.from(participant.trackPublications.values())
          .find(pub => pub.track?.kind === Track.Kind.Video && pub.source === Track.Source.Camera)
          ?.track as RemoteTrack | undefined;
        const audioTrack = Array.from(participant.trackPublications.values())
          .find(pub => pub.track?.kind === Track.Kind.Audio && pub.source === Track.Source.Microphone)
          ?.track as RemoteTrack | undefined;
        
        gridParticipants.push({
          id: userId,
          name: `user_${userId.substring(0, 8)}`,
          videoTrack: videoTrack || undefined,
          audioTrack: audioTrack || undefined,
          isHost: true,
          avatarUrl: undefined,
        });
        return;
      }
      
      // Skip if not in session
      if (!participantInfo) {
        console.warn('[LiveKit][Battle] Unknown participant in room:', {
          identity,
          normalizedUserId: userId,
          sessionParticipants: hostSnapshot.participants?.map(p => p.id),
        });
        
        // Trigger refresh if needed (immediate - no debounce for unknown participants joining)
        if (onRefreshSession) {
          const now = Date.now();
          if (now - lastRefreshRequestRef.current > 500) {
            lastRefreshRequestRef.current = now;
            console.log('[LiveKit][Battle] Unknown participant detected - triggering immediate session refresh');
            onRefreshSession();
          }
        }
        return;
      }
      
      // Find video and audio tracks
      const videoTrack = Array.from(participant.trackPublications.values())
        .find(pub => pub.track?.kind === Track.Kind.Video && pub.source === Track.Source.Camera)
        ?.track as RemoteTrack | undefined;
      const audioTrack = Array.from(participant.trackPublications.values())
        .find(pub => pub.track?.kind === Track.Kind.Audio && pub.source === Track.Source.Microphone)
        ?.track as RemoteTrack | undefined;
      
      console.log('[LiveKit][Battle] Adding to grid:', {
        userId,
        name: participantInfo.display_name || participantInfo.username,
        hasVideoTrack: !!videoTrack,
        hasAudioTrack: !!audioTrack,
        slot: participantInfo.slot_index,
      });
      
      gridParticipants.push({
        id: userId,
        name: participantInfo.display_name || participantInfo.username,
        videoTrack: videoTrack || undefined,
        audioTrack: audioTrack || undefined,
        isHost: true,
        avatarUrl: participantInfo.avatar_url || undefined,
      });
    });
    
    // Sort participants:
    // - Hosts: current user first (personalized view)
    // - Viewers: target host first (the host they clicked on)
    gridParticipants.sort((a, b) => {
      if (canPublish) {
        // Host view: current user first, then by slot
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
      } else if (targetHostId) {
        // Viewer view: target host first (the host they clicked on), then by slot
        if (a.id === targetHostId) return -1;
        if (b.id === targetHostId) return 1;
      }
      // Fallback: sort by slot_index
      const aSlot = hostSnapshot.participants?.find(p => p.id === a.id)?.slot_index || 99;
      const bSlot = hostSnapshot.participants?.find(p => p.id === b.id)?.slot_index || 99;
      return aSlot - bSlot;
    });
    
    console.log('[LiveKit][Battle] Final grid participants:', {
      count: gridParticipants.length,
      participants: gridParticipants.map(p => ({
        id: p.id,
        name: p.name,
        hasVideoTrack: !!p.videoTrack,
        hasAudioTrack: !!p.audioTrack,
        isCurrentUser: p.id === currentUserId,
      })),
      expectedCount: hostSnapshot.participants?.length || 0,
    });
    
    // Simplified: Just set participants - no complex preservation logic
    setParticipants(gridParticipants);
    participantsRef.current = gridParticipants;
    const hasParticipants = gridParticipants.length > 0;
    
    if (hasParticipants) {
      setParticipantsReady(true);
      if (emptyStateTimeoutRef.current) {
        clearTimeout(emptyStateTimeoutRef.current);
        emptyStateTimeoutRef.current = null;
      }
      if (hydrationIntervalRef.current) {
        clearInterval(hydrationIntervalRef.current);
        hydrationIntervalRef.current = null;
      }
      setAllowEmptyState(true);
    } else {
      setParticipantsReady(false);
    }
    
    // Initialize volumes for new participants
    setVolumes(prev => {
      const newVolumes = [...prev];
      gridParticipants.forEach(p => {
        if (!newVolumes.find(v => v.participantId === p.id)) {
          newVolumes.push({ participantId: p.id, volume: 0.7, isMuted: false });
        }
      });
      return newVolumes;
    });
  }, [canPublish, currentUserId, currentUserName, hostSnapshot, roomName, onRefreshSession, isConnected]);
  
  // Store updateParticipants in a ref so effects can access it without dependency issues
  const updateParticipantsRef = useRef(updateParticipants);
  useEffect(() => {
    updateParticipantsRef.current = updateParticipants;
  }, [updateParticipants]);
  
  // Debounced participant update scheduler
  // Coalesces multiple events in same frame into single update (max ~60 updates/sec vs 200+)
  // CRITICAL: Must be defined after updateParticipants since it depends on it
  const requestParticipantsUpdate = useCallback((reason: string) => {
    if (pendingUpdateRef.current) return;
    pendingUpdateRef.current = true;

    // Use rAF so multiple events in same frame become 1 update
    rafRef.current = requestAnimationFrame(() => {
      pendingUpdateRef.current = false;
      rafRef.current = null;
      updateParticipantsRef.current(reason);
    });
  }, []); // No dependencies - uses ref
  
  // Watch hostSnapshot changes and update participants when new hosts join
  const prevHostSnapshotRef = useRef<typeof hostSnapshot>(null);
  useEffect(() => {
    if (!hostSnapshot || !isConnected) {
      prevHostSnapshotRef.current = hostSnapshot;
      return;
    }
    
    // Check if participants actually changed (not just a reference change)
    const prevSnapshot = prevHostSnapshotRef.current;
    
    // Get participant IDs from snapshot
    const getParticipantIds = (snapshot: typeof hostSnapshot | null): string[] => {
      if (!snapshot || !snapshot.participants) return [];
      return snapshot.participants.map(p => p.id).sort();
    };
    
    const prevIds = getParticipantIds(prevSnapshot);
    const currentIds = getParticipantIds(hostSnapshot);
    const participantsChanged = prevIds.join(',') !== currentIds.join(',');
    
    if (participantsChanged) {
      console.log('[LiveKit][Battle] Host snapshot changed - participants updated', {
        prevIds,
        currentIds,
        prevCount: prevIds.length,
        newCount: currentIds.length,
      });
      
      // Trigger update when hostSnapshot changes (new participants added/removed)
      // Use multiple attempts with delays to catch participants who join at different times
      const timeoutId1 = setTimeout(() => {
        updateParticipantsRef.current('host_snapshot_changed_1');
      }, 300);
      
      const timeoutId2 = setTimeout(() => {
        updateParticipantsRef.current('host_snapshot_changed_2');
      }, 1000);
      
      const timeoutId3 = setTimeout(() => {
        updateParticipantsRef.current('host_snapshot_changed_3');
      }, 2000);
      
      prevHostSnapshotRef.current = hostSnapshot;
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
    
    prevHostSnapshotRef.current = hostSnapshot;
  }, [hostSnapshot, isConnected]);
  
  // No longer needed - removed complex status transition logic
  const prevStatusRef = useRef<string | null>(null);
  
  // CRITICAL: Watch ready_states changes and trigger refresh if needed
  // This ensures the modal updates when other hosts set their ready state
  const prevReadyStatesRef = useRef<string>('');
  useEffect(() => {
    if (!isBattleReady) {
      prevReadyStatesRef.current = '';
      return;
    }
    
    const currentReadyStatesStr = JSON.stringify(readyStates);
    const prevReadyStatesStr = prevReadyStatesRef.current;
    
    // If ready_states changed and we're in battle_ready phase, ensure we have latest data
    if (currentReadyStatesStr !== prevReadyStatesStr && prevReadyStatesStr !== '') {
      console.log('[LiveKit][Battle] Ready states changed - ensuring session is up to date', {
        prev: prevReadyStatesStr,
        current: currentReadyStatesStr,
      });
      // The real-time subscription should handle this, but trigger a refresh to be sure
      if (onRefreshSession) {
        setTimeout(() => onRefreshSession(), 100);
      }
    }
    
    prevReadyStatesRef.current = currentReadyStatesStr;
  }, [readyStates, isBattleReady, onRefreshSession]);
  
  // CRITICAL: Poll session during battle_ready phase to ensure ready_states updates are seen immediately
  // This ensures all hosts see when others press ready, even if real-time subscription has delays
  const readyPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isBattleReady || !onRefreshSession) {
      if (readyPollIntervalRef.current) {
        clearInterval(readyPollIntervalRef.current);
        readyPollIntervalRef.current = null;
      }
      return;
    }
    
    // Poll every 1 second during battle_ready to catch ready_states updates quickly
    readyPollIntervalRef.current = setInterval(() => {
      console.log('[LiveKit][Battle] Polling session for ready_states updates');
      onRefreshSession();
    }, 1000);
    
    return () => {
      if (readyPollIntervalRef.current) {
        clearInterval(readyPollIntervalRef.current);
        readyPollIntervalRef.current = null;
      }
    };
  }, [isBattleReady, onRefreshSession]);
  
  // Connect to battle/cohost room
  // CRITICAL: Only reconnect if room name actually changed, not on every session update
  useEffect(() => {
    let isActive = true;
    
    const connectRoom = async () => {
      // Don't connect if no room name (session not ready yet)
      if (!roomName) {
        console.log('[BattleGridWrapper] Skipping connection - no room name yet');
        return;
      }
      
      // CRITICAL: If we're already connected to this room, don't reconnect
      if (roomRef.current && connectedRoomNameRef.current === roomName && isConnected) {
        console.log('[BattleGridWrapper] Already connected to room, skipping reconnect:', roomName);
        return;
      }
      
      // If we're connected to a different room, disconnect first
      if (roomRef.current && connectedRoomNameRef.current !== roomName) {
        console.log('[BattleGridWrapper] Room changed, disconnecting old room:', {
          old: connectedRoomNameRef.current,
          new: roomName,
        });
        try {
          await roomRef.current.disconnect();
        } catch (err) {
          console.error('[BattleGridWrapper] Error disconnecting old room:', err);
        }
        roomRef.current = null;
        connectedRoomNameRef.current = null;
        setIsConnected(false);
      }
      
      try {
        // Get token for battle/cohost room
        const response = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            roomName,
            participantName: currentUserName,
            canPublish,
            canSubscribe: true,
            role: canPublish ? 'host' : 'viewer',
            deviceType: 'web',
            deviceId: `battle_grid_${currentUserId || 'viewer'}_${session.session_id}`,
            sessionId: session.session_id, // Pass session ID to create proper identity
            // CRITICAL: For viewers, use explicit viewer identity to prevent confusion
            identity: canPublish ? undefined : `viewer_${currentUserId || 'anon'}_${session.session_id}`,
          }),
        });
        
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to get token');
        }
        
        const { token, url } = await response.json();
        
        if (!isActive) return;
        
        // Create and connect room
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          // Optimize for viewer experience
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
          // Prefer lower quality layers for faster initial load
          publishDefaults: {
            simulcast: true,
            videoSimulcastLayers: [
              // LiveKit expects `VideoPreset[]` here (encoding + resolution).
              VideoPresets.h180,
              VideoPresets.h360,
              VideoPresets.h720,
            ],
          },
        });
        
        room.on(RoomEvent.Connected, () => {
          console.log('[LiveKit][Battle] connected', {
            roomName,
            canPublish,
            participant: room.localParticipant.identity,
          });
          if (isActive) {
            setIsConnected(true);
            setParticipantsReady(false);
            setAllowEmptyState(false);
            if (emptyStateTimeoutRef.current) {
              clearTimeout(emptyStateTimeoutRef.current);
            }
            emptyStateTimeoutRef.current = setTimeout(() => {
              setAllowEmptyState(true);
              emptyStateTimeoutRef.current = null;
            }, 4000);
            setError(null);
            onRoomConnected?.();
          }
        });
        
        room.on(RoomEvent.Disconnected, (reason) => {
          console.log('[LiveKit][Battle] disconnected', {
            roomName,
            reason,
          });
          if (isActive) {
            setIsConnected(false);
            onRoomDisconnected?.();
          }
        });

        room.on(RoomEvent.Reconnecting, () => {
          console.log('[LiveKit][Battle] reconnecting', { roomName });
        });

        room.on(RoomEvent.Reconnected, () => {
          console.log('[LiveKit][Battle] reconnected', { roomName });
          if (isActive) {
            updateParticipantsRef.current('reconnected');
          }
        });
        
        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log('[LiveKit][Battle] participant joined', {
            roomName,
            identity: participant.identity,
            trackCount: participant.trackPublications.size,
          });
          if (!isBattleGridIdentity(participant.identity)) {
            console.log('[LiveKit][Battle] Ignoring viewer/unknown participant:', participant.identity);
            return;
          }
          
          // CRITICAL: When a battle participant connects, check if they're in our session
          // If not, trigger a session refresh immediately
          const userId = normalizeParticipantId(participant.identity);
          const isInSession = hostSnapshot?.participants?.some(p => p.id === userId);
          
          if (!isInSession && onRefreshSession) {
            console.log('[LiveKit][Battle] Participant connected but not in session snapshot - will refresh if needed', {
              userId,
              identity: participant.identity,
            });
            const now = Date.now();
            // Increased debounce to prevent refresh loops
            if (now - lastRefreshRequestRef.current > 2000) { // 2 second debounce
              lastRefreshRequestRef.current = now;
              onRefreshSession();
              // Schedule update after refresh completes
              setTimeout(() => {
                updateParticipantsRef.current('after_participant_connect_refresh');
              }, 1500);
            }
          }
          
          updateParticipantsRef.current('participant_connected');
        });
        
        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log('[LiveKit][Battle] participant disconnected', {
            roomName,
            identity: participant.identity,
          });
          if (!isBattleGridIdentity(participant.identity)) {
            return;
          }
          updateParticipantsRef.current('participant_disconnected');
        });
        
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          console.log('[LiveKit][Battle] track subscribed', {
            roomName,
            identity: participant.identity,
            kind: track.kind,
          });
          if (!isBattleGridIdentity(participant.identity)) {
            console.log('[LiveKit][Battle] ❌ Ignoring track from viewer/unknown:', participant.identity);
            return;
          }
          console.log('[LiveKit][Battle] ✅ Triggering update for battle participant track:', participant.identity);
          updateParticipantsRef.current(`track_subscribed:${track.kind}`);
        });
        
        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          console.log('[LiveKit][Battle] track unsubscribed', {
            roomName,
            identity: participant.identity,
            kind: track.kind,
          });
          if (!isBattleGridIdentity(participant.identity)) {
            console.log('[LiveKit][Battle] ❌ Ignoring unsubscribe from viewer/unknown:', participant.identity);
            return;
          }
          console.log('[LiveKit][Battle] ✅ Triggering update for battle participant unsubscribe:', participant.identity);
          updateParticipantsRef.current(`track_unsubscribed:${track.kind}`);
        });
        
        // REMOVED: TrackPublished/Unpublished events fire for ALL participants including viewers
        // These don't provide participant identity, so we can't filter viewers
        // TrackSubscribed/Unsubscribed already handle grid updates with proper filtering
        
        // Set roomRef BEFORE connect to avoid race condition
        roomRef.current = room;
        connectedRoomNameRef.current = roomName; // Track which room we're connecting to
        await room.connect(url, token);
        
        // If we can publish, create and publish local tracks
        if (canPublish && isActive) {
          try {
            const tracks = await createLocalTracks({
              video: {
                resolution: VideoPresets.h720.resolution,
              },
              audio: true,
            });
            
            for (const track of tracks) {
              await room.localParticipant.publishTrack(track);
              if (track.kind === Track.Kind.Video) {
                localTracksRef.current.video = track;
              } else if (track.kind === Track.Kind.Audio) {
                localTracksRef.current.audio = track;
              }
            }
            
            // Update participants after publishing completes
            updateParticipants('local_tracks_published');
          } catch (err) {
            console.error('[BattleGridWrapper] Error publishing tracks:', err);
          }
        } else if (isActive) {
          // For viewers, update participants after connect
          // Use updateParticipants directly since requestParticipantsUpdate might not be defined yet
          // The hostSnapshot change effect will also trigger updates
          updateParticipants('initial_connect');
        }
        
        // CRITICAL: After connection, also trigger an update after a short delay
        // This catches participants who joined while we were connecting
        setTimeout(() => {
          if (isActive && roomRef.current) {
            updateParticipants('post_connect_delayed');
          }
        }, 1500);
        
      } catch (err: any) {
        console.error('[BattleGridWrapper] Connection error:', err);
        if (isActive) {
          setError(err.message || 'Failed to connect to battle room');
        }
      }
    };
    
    connectRoom();
    
    return () => {
      isActive = false;
      if (emptyStateTimeoutRef.current) {
        clearTimeout(emptyStateTimeoutRef.current);
        emptyStateTimeoutRef.current = null;
      }
      if (hydrationIntervalRef.current) {
        clearInterval(hydrationIntervalRef.current);
        hydrationIntervalRef.current = null;
      }
      
      // Cancel any pending rAF update
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingUpdateRef.current = false;
      
      // Stop local tracks
      if (localTracksRef.current.video) {
        localTracksRef.current.video.stop();
      }
      if (localTracksRef.current.audio) {
        localTracksRef.current.audio.stop();
      }
      localTracksRef.current = { video: null, audio: null };
      
      // Disconnect room
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      connectedRoomNameRef.current = null;
    };
  }, [roomName, isConnected, onRoomConnected, onRoomDisconnected, reconnectTrigger, updateParticipantsRef]);

  // Poll room participants briefly after connect to capture existing hosts
  useEffect(() => {
    if (!isConnected) {
      if (hydrationIntervalRef.current) {
        clearInterval(hydrationIntervalRef.current);
        hydrationIntervalRef.current = null;
      }
      return;
    }

    if (hydrationIntervalRef.current) {
      clearInterval(hydrationIntervalRef.current);
      hydrationIntervalRef.current = null;
    }

    hydrationIntervalRef.current = setInterval(() => {
      const room = roomRef.current;
      if (!room || !hostSnapshot || !hostSnapshot.participants) {
        return;
      }
      
      // Count battle grid participants (exclude viewers)
      let battleParticipantCount = room.localParticipant && canPublish ? 1 : 0;
      let foundUnknownParticipant = false;
      
      room.remoteParticipants.forEach((participant) => {
        if (!isBattleGridIdentity(participant.identity)) {
          return; // Skip viewers
        }
        
        battleParticipantCount++;
        const userId = normalizeParticipantId(participant.identity);
        
        // Check if this participant should be in our session but isn't in hostSnapshot
        const isInSnapshot = hostSnapshot.participants.some(p => p.id === userId);
        
        if (!isInSnapshot) {
          console.log('[LiveKit][Battle] Found participant in room not in snapshot - triggering refresh', {
            userId,
            identity: participant.identity,
            hostSnapshotParticipants: hostSnapshot.participants.map(p => p.id),
          });
          foundUnknownParticipant = true;
        }
      });
      
      // If we found a participant that should be in our session, trigger refresh
      if (foundUnknownParticipant && onRefreshSession) {
        const now = Date.now();
        if (now - lastRefreshRequestRef.current > 500) {
          lastRefreshRequestRef.current = now;
          console.log('[LiveKit][Battle] Polling detected unknown participant - refreshing session immediately');
          onRefreshSession();
          setTimeout(() => {
            updateParticipantsRef.current('after_polling_refresh');
          }, 500);
        }
      }
      
      if (battleParticipantCount === 0) {
        return;
      }
      updateParticipantsRef.current('hydration_poll');
    }, 2000); // Poll every 2 seconds

    return () => {
      if (hydrationIntervalRef.current) {
        clearInterval(hydrationIntervalRef.current);
        hydrationIntervalRef.current = null;
      }
    };
  }, [isConnected, hostSnapshot, canPublish, onRefreshSession, currentUserId, updateParticipantsRef]);
  
  // Handle reset connection (fixes camera issues)
  const handleResetConnection = useCallback(async () => {
    console.log('[LiveKit][Battle] Resetting connection - stopping all tracks and releasing camera...');
    setIsResetting(true);
    setError(null);
    
    try {
      // Unpublish tracks from room first
      if (roomRef.current) {
        const room = roomRef.current;
        const localParticipant = room.localParticipant;
        
        // Unpublish all local tracks
        localParticipant.trackPublications.forEach((pub) => {
          if (pub.track) {
            console.log('[LiveKit][Battle] Unpublishing track:', pub.track.kind);
            localParticipant.unpublishTrack(pub.track);
          }
        });
      }
      
      // Stop and release local tracks
      if (localTracksRef.current.video) {
        console.log('[LiveKit][Battle] Stopping video track');
        localTracksRef.current.video.stop();
        // Also stop the underlying media stream track
        if (localTracksRef.current.video.mediaStreamTrack) {
          localTracksRef.current.video.mediaStreamTrack.stop();
        }
      }
      if (localTracksRef.current.audio) {
        console.log('[LiveKit][Battle] Stopping audio track');
        localTracksRef.current.audio.stop();
        if (localTracksRef.current.audio.mediaStreamTrack) {
          localTracksRef.current.audio.mediaStreamTrack.stop();
        }
      }
      localTracksRef.current = { video: null, audio: null };
      
      // Disconnect room
      if (roomRef.current) {
        console.log('[LiveKit][Battle] Disconnecting room');
        await roomRef.current.disconnect(true); // Force disconnect
        roomRef.current = null;
      }
      
      // Clear state
      setParticipants([]);
      setIsConnected(false);
      setParticipantsReady(false);
      setAllowEmptyState(false);
      
      // Longer delay to ensure camera is fully released
      console.log('[LiveKit][Battle] Waiting for camera release...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Trigger reconnection
      console.log('[LiveKit][Battle] Triggering reconnection');
      setReconnectTrigger(prev => prev + 1);
    } catch (err) {
      console.error('[LiveKit][Battle] Reset error:', err);
      setError('Failed to reset camera. Please refresh the page.');
    } finally {
      setIsResetting(false);
    }
  }, []);
  
  // Handle volume change
  const handleVolumeChange = useCallback((participantId: string, volume: number) => {
    setVolumes(prev => prev.map(v => 
      v.participantId === participantId ? { ...v, volume } : v
    ));
    
    // Apply volume to audio track
    const room = roomRef.current;
    if (!room) return;
    
    room.remoteParticipants.forEach((participant) => {
      // CRITICAL: Only affect battle participants, ignore viewers
      if (!isBattleGridIdentity(participant.identity)) {
        return;
      }
      
      const userId = normalizeParticipantId(participant.identity);
      if (userId === participantId) {
        participant.audioTrackPublications.forEach(pub => {
          if (pub.track) {
            (pub.track as any).setVolume?.(volume);
          }
        });
      }
    });
  }, []);
  
  // Handle mute toggle
  const handleMuteToggle = useCallback((participantId: string) => {
    setVolumes(prev => prev.map(v => 
      v.participantId === participantId ? { ...v, isMuted: !v.isMuted } : v
    ));
    
    // Apply mute to audio track
    const room = roomRef.current;
    if (!room) return;
    
    const vol = volumes.find(v => v.participantId === participantId);
    const shouldMute = vol ? !vol.isMuted : true;
    
    room.remoteParticipants.forEach((participant) => {
      // CRITICAL: Only affect battle participants, ignore viewers
      if (!isBattleGridIdentity(participant.identity)) {
        return;
      }
      
      const userId = normalizeParticipantId(participant.identity);
      if (userId === participantId) {
        participant.audioTrackPublications.forEach(pub => {
          if (pub.track) {
            (pub.track as any).setVolume?.(shouldMute ? 0 : (vol?.volume || 0.7));
          }
        });
      }
    });
  }, [volumes]);
  
  // Simplified connecting overlay check
  const showConnectingOverlay = !participantsReady && !allowEmptyState;

  // Handle cooldown actions
  const handleRematch = useCallback(async () => {
    // Send battle invite to start a new battle
    console.log('[BattleGridWrapper] Rematch clicked');
    try {
      const response = await fetch('/api/battle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to send battle invite');
      }
      // Battle invite sent, other host will see popup
    } catch (err) {
      console.error('[BattleGridWrapper] Rematch error:', err);
    }
  }, [session?.session_id]);

  const handleStartBattle = useCallback(async () => {
    // Start battle READY phase - everyone must ready up before battle begins
    console.log('[BattleGridWrapper] Start Battle clicked - entering READY phase');
    try {
      const result = await startBattleReady(session.session_id);
      console.log('[BattleGridWrapper] Battle ready phase started:', result);
      // Trigger immediate refresh so session status updates to battle_ready
      if (onRefreshSession) {
        setTimeout(() => onRefreshSession(), 100);
      }
    } catch (err) {
      console.error('[BattleGridWrapper] Start battle error:', err);
    }
  }, [session?.session_id, onRefreshSession]);
  
  const handleSetReady = useCallback(async () => {
    console.log('[BattleGridWrapper] Ready Up clicked', {
      sessionId: session?.session_id,
      sessionStatus: session?.status,
      sessionType: session?.type,
      isBattleReady,
      readyStates,
    });
    
    // Validate session is in correct state before calling RPC
    if (session?.status !== 'battle_ready') {
      console.error('[BattleGridWrapper] Cannot set ready - session not in battle_ready state:', session?.status);
      // Try refreshing to get latest state
      if (onRefreshSession) {
        onRefreshSession();
      }
      return;
    }
    
    setSettingReady(true);
    try {
      const result = await setBattleReady(session.session_id, true);
      console.log('[BattleGridWrapper] Ready set:', result);
      // Trigger immediate refresh to update ready states / session status
      // Real-time subscription should also trigger, but immediate refresh ensures modal updates
      if (onRefreshSession) {
        onRefreshSession(); // Immediate refresh
        // Also refresh after a short delay to catch any propagation delays
        setTimeout(() => onRefreshSession(), 500);
      }
    } catch (err) {
      console.error('[BattleGridWrapper] Set ready error:', err);
      // Refresh session to get latest state
      if (onRefreshSession) {
        onRefreshSession();
      }
    } finally {
      setSettingReady(false);
    }
  }, [session?.session_id, session?.status, session?.type, isBattleReady, readyStates, onRefreshSession]);
  
  const handleAcceptBattleInvite = useCallback(async (inviteId: string) => {
    console.log('[BattleGridWrapper] Accept battle invite:', inviteId);
    try {
      const response = await fetch('/api/battle/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: inviteId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('[BattleGridWrapper] Accept battle API error:', data);
        throw new Error(data.error || 'Failed to accept battle invite');
      }
      
      console.log('[BattleGridWrapper] Accept battle success:', data);
      // Session will convert to battle via realtime (or wait for others)
      setBattleInvite(null);
    } catch (err) {
      console.error('[BattleGridWrapper] Accept battle error:', err);
      throw err;
    }
  }, []);
  
  const handleDeclineBattleInvite = useCallback(async (inviteId: string) => {
    console.log('[BattleGridWrapper] Decline battle invite:', inviteId);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('rpc_decline_battle_invite_from_cohost', {
        p_invite_id: inviteId,
      });
      if (error) {
        throw error;
      }
      setBattleInvite(null);
    } catch (err) {
      console.error('[BattleGridWrapper] Decline battle error:', err);
      throw err;
    }
  }, []);

  // Listen for battle invites in cohost sessions
  useEffect(() => {
    if (!isCohostSession || !currentUserId) return;
    
    const supabase = createClient();
    
    // Helper to process an invite and show popup
    const processInvite = (invite: any) => {
      if (invite.to_host_id === currentUserId && invite.type === 'battle' && invite.status === 'pending') {
        // Get sender username from participants
        const otherHostId = invite.from_host_id;
        let otherHost: { username: string; display_name: string | null } | null = null;
        if (hostSnapshot?.participants) {
          const participant = hostSnapshot.participants.find(p => p.id === otherHostId);
          if (participant) {
            otherHost = { username: participant.username, display_name: participant.display_name };
          }
        }
        if (otherHost) {
          setBattleInvite({
            id: invite.id,
            fromUsername: otherHost.display_name || otherHost.username,
          });
        }
      }
    };
    
    // Check for existing pending battle invites on mount
    const checkExistingInvites = async () => {
      const { data: invites, error } = await supabase
        .from('live_session_invites')
        .select('*')
        .eq('session_id', session.session_id)
        .eq('to_host_id', currentUserId)
        .eq('type', 'battle')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!error && invites && invites.length > 0) {
        console.log('[BattleGridWrapper] Found existing pending battle invite:', invites[0].id);
        processInvite(invites[0]);
      }
    };
    
    checkExistingInvites();
    
    // Also listen for new invites via realtime
    const channel = supabase
      .channel(`battle_invites_${session.session_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_invites',
          filter: `session_id=eq.${session.session_id}`,
        },
        async (payload) => {
          processInvite(payload.new as any);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCohostSession, currentUserId, session?.session_id, hostSnapshot]);

  // ============================================================================
  // DEFENSIVE CHECKS - Early returns AFTER all hooks are declared
  // This ensures consistent hook calls even when props/state change
  // ============================================================================
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/90 text-white ${className}`}>
        <div className="text-center p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">Failed to connect to session</p>
        </div>
      </div>
    );
  }
  
  if (!session || !currentUserId || !currentUserName) {
    return (
      <div className={`flex items-center justify-center bg-black/90 text-white ${className}`}>
        <div className="text-center p-4">
          <p className="text-gray-500 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Battle Score Bar - at top of flex column */}
      {isBattleSession && battleStates.size > 0 ? (
        <div className="w-full bg-black/60 flex-shrink-0">
          <BattleScoreSlider
            battleStates={battleStates}
            battleMode={battleMode}
            height={20}
            hostId={canPublish ? currentUserId : (targetHostId || currentUserId)}
            rounded={false}
          />
        </div>
      ) : (
        isBattleSession && console.log('[BattleGrid] Score bar NOT showing. battleStates.size:', battleStates.size)
      )}
      
      {/* Grid Container - flex-1 takes remaining space */}
      <div className="relative flex-1 w-full">
        <MultiHostGrid
          participants={participants}
          mode={gridMode}
          maxSlots={gridMaxSlots}
          currentUserId={currentUserId}
          volumes={volumes}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          isBattleMode={isBattleSession}
          renderOverlay={(isBattleSession || isBattleReady) ? renderBattleOverlay : undefined}
        />
        
        {((!isConnected) || showConnectingOverlay) && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white/60 text-sm">Connecting to session...</p>
            </div>
          </div>
        )}
        
        {/* Boost Round Indicator - overlay on grid */}
        {isBattleSession && scores?.boost.active && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <BoostRoundIndicator
              active={scores.boost.active}
              multiplier={scores.boost.multiplier}
              endsAt={scores.boost.ends_at}
            />
          </div>
        )}

        {/* Bottom Row: Timer/Gifters - at bottom of flex column, above chat */}
        {(isBattleSession || (isCohostSession && canPublish)) && (
          <div className="w-full flex-shrink-0 flex items-center justify-between px-2 py-1">
            {/* Left side: Gifters for first team/streamer */}
            <div className="flex items-center gap-1">
              {isBattleSession && topGifters.length > 0 && (
                <TopGiftersDisplay
                  gifters={topGifters.filter(g => g.rank <= 3)}
                  side="A"
                  color={TEAM_COLORS.A}
                />
              )}
            </div>

            {/* Center: Timer or Start Battle button */}
            <div className="flex-shrink-0">
              {!isInCooldown && isBattleSession && isBattleActive ? (
                <BattleTimer
                  remainingSeconds={remainingSeconds}
                  phase="active"
                  mode={session.mode}
                  compact
                />
              ) : !isInCooldown && isCohostSession && canPublish && !isBattleActive ? (
                <CohostStartBattleButton onStartBattle={handleStartBattle} />
              ) : null}
            </div>

            {/* Right side: Reserved for second team/streamer gifters (if needed) */}
            <div className="flex items-center gap-1">
              {/* Placeholder for now - will show team B gifters if 1v1 */}
            </div>
          </div>
        )}
      </div>
      
      {/* Cooldown controls (battle only, host only) */}
      {isBattleSession && isInCooldown && canPublish && (
        <BattleCooldownControls
          onRematch={handleRematch}
        />
      )}
      
      {/* Battle Invite Popup */}
      {battleInvite && (
        <BattleInvitePopup
          inviteId={battleInvite.id}
          fromUsername={battleInvite.fromUsername}
          onAccept={handleAcceptBattleInvite}
          onDecline={handleDeclineBattleInvite}
          onClose={() => setBattleInvite(null)}
        />
      )}
      
      {/* Battle Ready Modal - shown ONLY to HOSTS during battle_ready phase (battle/cohost only) */}
      {/* Viewers should NOT see this modal - they should see no changes until battle starts */}
      {/* Only show for battle/cohost sessions, NOT solo streams */}
      {isBattleReady && (isBattleSession || isCohostSession) && canPublish && modalParticipants.some(p => p.id === currentUserId) && (
        <BattleReadyModal
          key={`battle-ready-${session?.session_id}-${JSON.stringify(readyStates)}`}
          isOpen={true}
          participants={modalParticipants}
          readyStates={readyStates}
          currentUserId={currentUserId}
          isCurrentUserReady={isCurrentUserReady}
          isSettingReady={settingReady}
          onSetReady={handleSetReady}
        />
      )}
    </div>
  );
}
