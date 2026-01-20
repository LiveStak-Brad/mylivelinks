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
import { LiveSession, getSessionRoomName } from '@/lib/battle-session';
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
import useBattleScores from '@/hooks/useBattleScores';
import TopGiftersDisplay, { TeamTopGifter } from './TopGiftersDisplay';
import { createClient } from '@/lib/supabase';

const normalizeParticipantId = (identity: string): string => {
  return identity
    .replace(/^(u_|guest_)/i, '')
    .split(':')[0]
    .trim();
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
  /** Remaining seconds in current phase */
  remainingSeconds: number;
  /** Additional className for wrapper */
  className?: string;
  /** Callback when room connects */
  onRoomConnected?: () => void;
  /** Callback when room disconnects */
  onRoomDisconnected?: () => void;
}

export default function BattleGridWrapper({
  session,
  currentUserId,
  currentUserName,
  canPublish,
  remainingSeconds,
  className = '',
  onRoomConnected,
  onRoomDisconnected,
}: BattleGridWrapperProps) {
  const [participants, setParticipants] = useState<GridTileParticipant[]>([]);
  const [volumes, setVolumes] = useState<ParticipantVolume[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [participantsReady, setParticipantsReady] = useState(false);
  const [allowEmptyState, setAllowEmptyState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isBattleSession = session.type === 'battle';
  const isCohostSession = session.type === 'cohost';
  const isInCooldown = session.status === 'cooldown';
  
  // Battle scores hook (only for battle sessions)
  const { scores, awardChatPoints } = useBattleScores({
    sessionId: isBattleSession ? session.session_id : null,
    autoFetch: isBattleSession,
  });
  
  // Battle invite state
  const [battleInvite, setBattleInvite] = useState<{
    id: string;
    fromUsername: string;
  } | null>(null);

  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<{ video: any; audio: any }>({ video: null, audio: null });
  const emptyStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hydrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const roomName = useMemo(() => 
    getSessionRoomName(session.session_id, session.type), 
    [session.session_id, session.type]
  );

  // Host metadata should not force LiveKit reconnection when only session.status/timers change.
  // We derive a stable host snapshot based on identity fields.
  // Supports both old host_a/host_b format and new participants array
  const hostSnapshot = useMemo(() => {
    // Use participants array if available (new multi-host format)
    if (session.participants && Array.isArray(session.participants) && session.participants.length > 0) {
      const participantList = session.participants as Array<{
        profile_id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        team: string;
        slot_index: number;
      }>;
      
      return {
        hostA: participantList[0] ? {
          id: participantList[0].profile_id,
          username: participantList[0].username,
          display_name: participantList[0].display_name,
          avatar_url: participantList[0].avatar_url,
        } : null,
        hostB: participantList[1] ? {
          id: participantList[1].profile_id,
          username: participantList[1].username,
          display_name: participantList[1].display_name,
          avatar_url: participantList[1].avatar_url,
        } : null,
        participants: participantList,
        type: session.type,
        session_id: session.session_id,
      };
    }
    
    // Fallback to old host_a/host_b format
    return {
      hostA: session.host_a ? {
        id: session.host_a.id,
        username: session.host_a.username,
        display_name: session.host_a.display_name,
        avatar_url: session.host_a.avatar_url,
      } : null,
      hostB: session.host_b ? {
        id: session.host_b.id,
        username: session.host_b.username,
        display_name: session.host_b.display_name,
        avatar_url: session.host_b.avatar_url,
      } : null,
      participants: null,
      type: session.type,
      session_id: session.session_id,
    };
  }, [
    session.participants,
    session.host_a?.id,
    session.host_a?.username,
    session.host_a?.display_name,
    session.host_a?.avatar_url,
    session.host_b?.id,
    session.host_b?.username,
    session.host_b?.display_name,
    session.host_b?.avatar_url,
    session.type,
    session.session_id,
  ]);

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

  // Derive top 3 gifters per team from scores.supporters
  const { teamAGifters, teamBGifters } = useMemo((): { 
    teamAGifters: TeamTopGifter[]; 
    teamBGifters: TeamTopGifter[]; 
  } => {
    if (!scores?.supporters || scores.supporters.length === 0) {
      return { teamAGifters: [], teamBGifters: [] };
    }

    const mapToGifter = (s: typeof scores.supporters[0], rank: 1 | 2 | 3): TeamTopGifter => ({
      profile_id: s.profile_id,
      username: s.username,
      display_name: s.display_name,
      avatar_url: s.avatar_url,
      points: s.points,
      rank,
    });

    const teamA = scores.supporters
      .filter(s => s.side === 'A')
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((s, i) => mapToGifter(s, (i + 1) as 1 | 2 | 3));

    const teamB = scores.supporters
      .filter(s => s.side === 'B')
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((s, i) => mapToGifter(s, (i + 1) as 1 | 2 | 3));

    return { teamAGifters: teamA, teamBGifters: teamB };
  }, [scores?.supporters]);

  // Battle states with real scores and team-relative colors
  const battleStates = useMemo(() => {
    if (!isBattleSession) {
      return new Map<string, BattleParticipantState>();
    }

    const states = new Map<string, BattleParticipantState>();
    
    // Determine if current user is host A or B
    const isCurrentUserHostA = currentUserId === hostSnapshot.hostA?.id;
    
    // Team-relative color assignment:
    // Current user always sees THEIR color on their side
    // For host A: they see pink (A) on left, blue (B) on right
    // For host B: they see blue (B) on left, pink (A) on right (colors swap)
    const currentUserColor = isCurrentUserHostA ? TEAM_COLORS.A : TEAM_COLORS.B;
    const otherUserColor = isCurrentUserHostA ? TEAM_COLORS.B : TEAM_COLORS.A;
    
    // Use scores if available, otherwise default to 0
    const scoreA = scores?.points.A || 0;
    const scoreB = scores?.points.B || 0;
    const isALeading = scoreA >= scoreB;

    // Current user state (always first in grid)
    states.set(currentUserId, {
      participantId: currentUserId,
      score: isCurrentUserHostA ? scoreA : scoreB,
      color: currentUserColor,
      teamId: isCurrentUserHostA ? 'A' : 'B',
      rank: isCurrentUserHostA ? (isALeading ? 1 : 2) : (isALeading ? 2 : 1),
      isLeading: isCurrentUserHostA ? isALeading : !isALeading,
    });

    // Other host state (second in grid)
    const otherHostId = isCurrentUserHostA ? hostSnapshot.hostB?.id : hostSnapshot.hostA?.id;
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

    return states;
  }, [hostSnapshot.hostA?.id, hostSnapshot.hostB?.id, currentUserId, isBattleSession, scores]);

  const renderBattleOverlay = useCallback(
    (participant: GridTileParticipant) => {
      if (!isBattleSession) return null;
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
    [battleStates, battleMode, isBattleSession, participants.length]
  );
  
  // Map LiveKit participants to grid participants
  const updateParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    
    const gridParticipants: GridTileParticipant[] = [];
    
    // Add local participant if publishing
    const local = room.localParticipant;
    if (local && canPublish) {
      const videoTrack = local.getTrackPublication(Track.Source.Camera)?.track;
      const audioTrack = local.getTrackPublication(Track.Source.Microphone)?.track;
      
      // Determine if this is host_a or host_b - use participants array first
      let hostInfo: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null = null;
      if (hostSnapshot.participants) {
        const participant = hostSnapshot.participants.find(p => p.id === currentUserId);
        if (participant) {
          hostInfo = participant;
        }
      }
      if (!hostInfo) {
        const isHostA = currentUserId === hostSnapshot.hostA?.id;
        hostInfo = isHostA ? hostSnapshot.hostA : hostSnapshot.hostB;
      }
      
      if (hostInfo) {
        gridParticipants.push({
          id: currentUserId,
          name: hostInfo.display_name || hostInfo.username,
          videoTrack: videoTrack || undefined,
          audioTrack: audioTrack || undefined,
          isHost: true, // Current user is always "host" for their own view
          avatarUrl: hostInfo.avatar_url || undefined,
        });
      }
    }
    
    // Add remote participants - ONLY if they are hostA or hostB (invited hosts only)
    room.remoteParticipants.forEach((participant) => {
      // Extract user ID from identity (format: u_<uuid>[:device], guest_<uuid>[:device])
      const identity = participant.identity;
      const userId = normalizeParticipantId(identity);
      
      // Determine participant info from session - check participants array first, then hostA/hostB
      let hostInfo: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null = null;
      if (hostSnapshot.participants) {
        const participant = hostSnapshot.participants.find(p => p.id === userId);
        if (participant) {
          hostInfo = participant;
        }
      }
      if (!hostInfo) {
        const isHostA = userId === hostSnapshot.hostA?.id;
        const isHostB = userId === hostSnapshot.hostB?.id;
        hostInfo = isHostA ? hostSnapshot.hostA : isHostB ? hostSnapshot.hostB : null;
      }
      
      // Skip participants who are not invited hosts (never show UUID fallback)
      if (!hostInfo) {
        console.warn('[LiveKit][Battle] Ignoring uninvited participant', {
          roomName,
          identity,
          normalizedUserId: userId,
          hostA: hostSnapshot.hostA?.id,
          hostB: hostSnapshot.hostB?.id,
        });
        return; // Skip this participant
      }
      
      // Find video and audio tracks
      let videoTrack: RemoteTrack | undefined;
      let audioTrack: RemoteTrack | undefined;
      
      participant.trackPublications.forEach((pub) => {
        if (pub.track) {
          if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
            videoTrack = pub.track as RemoteTrack;
          } else if (pub.track.kind === Track.Kind.Audio && pub.source === Track.Source.Microphone) {
            audioTrack = pub.track as RemoteTrack;
          }
        }
      });
      
      gridParticipants.push({
        id: userId,
        name: hostInfo.display_name || hostInfo.username,
        videoTrack: videoTrack || undefined,
        audioTrack: audioTrack || undefined,
        isHost: true,
        avatarUrl: hostInfo.avatar_url || undefined,
      });
    });
    
    setParticipants(gridParticipants);
    const hasParticipants = gridParticipants.length > 0;
    setParticipantsReady(hasParticipants);

    if (hasParticipants) {
      if (emptyStateTimeoutRef.current) {
        clearTimeout(emptyStateTimeoutRef.current);
        emptyStateTimeoutRef.current = null;
      }
      if (hydrationIntervalRef.current) {
        clearInterval(hydrationIntervalRef.current);
        hydrationIntervalRef.current = null;
      }
      setAllowEmptyState(true);
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
  }, [canPublish, currentUserId, hostSnapshot]);
  
  // Connect to battle/cohost room
  useEffect(() => {
    let isActive = true;
    
    const connectRoom = async () => {
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
            updateParticipants();
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
            updateParticipants();
          }
        });
        
        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log('[LiveKit][Battle] participant joined', {
            roomName,
            identity: participant.identity,
            trackCount: participant.trackPublications.size,
          });
          updateParticipants();
        });
        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log('[LiveKit][Battle] participant disconnected', {
            roomName,
            identity: participant.identity,
          });
          updateParticipants();
        });
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          console.log('[LiveKit][Battle] track subscribed', {
            roomName,
            identity: participant.identity,
            kind: track.kind,
          });
          updateParticipants();
        });
        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          console.log('[LiveKit][Battle] track unsubscribed', {
            roomName,
            identity: participant.identity,
            kind: track.kind,
          });
          updateParticipants();
        });
        room.on(RoomEvent.TrackPublished, () => updateParticipants());
        room.on(RoomEvent.TrackUnpublished, () => updateParticipants());
        room.on(RoomEvent.LocalTrackPublished, () => updateParticipants());
        room.on(RoomEvent.LocalTrackUnpublished, () => updateParticipants());
        
        await room.connect(url, token);
        roomRef.current = room;
        
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
            
            updateParticipants();
          } catch (err) {
            console.error('[BattleGridWrapper] Error publishing tracks:', err);
          }
        }
        
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
    };
  }, [roomName, currentUserName, canPublish, updateParticipants, onRoomConnected, onRoomDisconnected]);

  // Poll room participants briefly after connect to capture existing hosts even if no events fire
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
      if (!room) {
        return;
      }
      const participantCount = room.remoteParticipants.size + (room.localParticipant ? 1 : 0);
      if (participantCount === 0) {
        return;
      }
      updateParticipants();
    }, 1000);

    return () => {
      if (hydrationIntervalRef.current) {
        clearInterval(hydrationIntervalRef.current);
        hydrationIntervalRef.current = null;
      }
    };
  }, [isConnected, updateParticipants]);
  
  // Handle volume change
  const handleVolumeChange = useCallback((participantId: string, volume: number) => {
    setVolumes(prev => prev.map(v => 
      v.participantId === participantId ? { ...v, volume } : v
    ));
    
    // Apply volume to audio track
    const room = roomRef.current;
    if (!room) return;
    
    room.remoteParticipants.forEach((participant) => {
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
  }, [session.session_id]);

  const handleStartBattle = useCallback(async () => {
    // Send battle invite from cohost session
    console.log('[BattleGridWrapper] Start Battle clicked');
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
      // Invite sent, other host will see popup
    } catch (err) {
      console.error('[BattleGridWrapper] Start battle error:', err);
    }
  }, [session.session_id]);
  
  const handleAcceptBattleInvite = useCallback(async (inviteId: string) => {
    console.log('[BattleGridWrapper] Accept battle invite:', inviteId);
    try {
      const response = await fetch('/api/battle/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: inviteId }),
      });
      if (!response.ok) {
        throw new Error('Failed to accept battle invite');
      }
      // Session will convert to battle via realtime
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
          const invite = payload.new as any;
          if (invite.to_host_id === currentUserId && invite.type === 'battle' && invite.status === 'pending') {
            // Get sender username - check participants first, then hostA/hostB
            const otherHostId = invite.from_host_id;
            let otherHost: { username: string; display_name: string | null } | null = null;
            if (hostSnapshot.participants) {
              const participant = hostSnapshot.participants.find(p => p.id === otherHostId);
              if (participant) {
                otherHost = participant;
              }
            }
            if (!otherHost) {
              otherHost = otherHostId === hostSnapshot.hostA?.id ? hostSnapshot.hostA : hostSnapshot.hostB;
            }
            if (otherHost) {
              setBattleInvite({
                id: invite.id,
                fromUsername: otherHost.display_name || otherHost.username,
              });
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCohostSession, currentUserId, session.session_id, hostSnapshot]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Battle Score Bar - attached to top of grid, flat edges, full width */}
      {isBattleSession && battleStates.size > 0 && (
        <div className="w-full bg-black/60">
          <BattleScoreSlider
            battleStates={battleStates}
            battleMode={battleMode}
            height={20}
            hostId={currentUserId}
            rounded={false}
          />
        </div>
      )}
      
      {/* Grid */}
      <div className="relative flex-1">
        <MultiHostGrid
          participants={participants}
          mode={gridMode}
          maxSlots={gridMaxSlots}
          currentUserId={currentUserId}
          volumes={volumes}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          isBattleMode={isBattleSession}
          renderOverlay={isBattleSession ? renderBattleOverlay : undefined}
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
      </div>

      {/* Bottom Row: Top Gifters (left/right) + Timer/StartBattle (center) */}
      {/* Unified layout: always render if battle/cohost active, content varies */}
      {(isBattleSession || (isCohostSession && canPublish)) && !isInCooldown && (
        <div className="w-full flex items-center justify-between px-2 py-1">
          {/* Left: Team A Top 3 Gifters */}
          <div className="flex-1 min-w-0">
            {isBattleSession && teamAGifters.length > 0 && (
              <TopGiftersDisplay
                gifters={teamAGifters}
                side="A"
                color={TEAM_COLORS.A}
              />
            )}
          </div>

          {/* Center: Timer (battle) or Start Battle (cohost) */}
          <div className="flex-shrink-0 px-2">
            {isBattleSession ? (
              <BattleTimer
                remainingSeconds={remainingSeconds}
                phase="active"
                mode={session.mode}
                compact
              />
            ) : isCohostSession && canPublish ? (
              <CohostStartBattleButton onStartBattle={handleStartBattle} />
            ) : null}
          </div>

          {/* Right: Team B Top 3 Gifters (only if exists) */}
          <div className="flex-1 min-w-0 flex justify-end">
            {isBattleSession && teamBGifters.length > 0 && (
              <TopGiftersDisplay
                gifters={teamBGifters}
                side="B"
                color={TEAM_COLORS.B}
              />
            )}
          </div>
        </div>
      )}
      
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
    </div>
  );
}
