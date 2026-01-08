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
import { LiveSession, getSessionRoomName, formatTimer } from '@/lib/battle-session';
import MultiHostGrid, { ParticipantVolume } from './MultiHostGrid';
import { GridTileParticipant } from './GridTile';
import BattleTimer from './BattleTimer';

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
  const [error, setError] = useState<string | null>(null);
  
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<{ video: any; audio: any }>({ video: null, audio: null });
  
  const roomName = useMemo(() => 
    getSessionRoomName(session.session_id, session.type), 
    [session.session_id, session.type]
  );

  // Host metadata should not force LiveKit reconnection when only session.status/timers change.
  // We derive a stable host snapshot based on identity fields.
  const hostSnapshot = useMemo(() => {
    return {
      hostA: {
        id: session.host_a.id,
        username: session.host_a.username,
        display_name: session.host_a.display_name,
        avatar_url: session.host_a.avatar_url,
      },
      hostB: {
        id: session.host_b.id,
        username: session.host_b.username,
        display_name: session.host_b.display_name,
        avatar_url: session.host_b.avatar_url,
      },
      type: session.type,
      session_id: session.session_id,
    };
  }, [
    session.host_a.id,
    session.host_a.username,
    session.host_a.display_name,
    session.host_a.avatar_url,
    session.host_b.id,
    session.host_b.username,
    session.host_b.display_name,
    session.host_b.avatar_url,
    session.type,
    session.session_id,
  ]);
  
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
      
      // Determine if this is host_a or host_b
      const isHostA = currentUserId === hostSnapshot.hostA.id;
      const hostInfo = isHostA ? hostSnapshot.hostA : hostSnapshot.hostB;
      
      gridParticipants.push({
        id: currentUserId,
        name: hostInfo.display_name || hostInfo.username,
        videoTrack: videoTrack || undefined,
        audioTrack: audioTrack || undefined,
        isHost: true, // Current user is always "host" for their own view
        avatarUrl: hostInfo.avatar_url || undefined,
      });
    }
    
    // Add remote participants
    room.remoteParticipants.forEach((participant) => {
      // Extract user ID from identity (format: u_<uuid> or guest_<uuid>)
      const identity = participant.identity;
      const userId = identity.replace(/^(u_|guest_)/, '');
      
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
      
      // Determine participant info from session
      const isHostA = userId === hostSnapshot.hostA.id;
      const isHostB = userId === hostSnapshot.hostB.id;
      const hostInfo = isHostA ? hostSnapshot.hostA : isHostB ? hostSnapshot.hostB : null;
      
      if (hostInfo) {
        gridParticipants.push({
          id: userId,
          name: hostInfo.display_name || hostInfo.username,
          videoTrack: videoTrack || undefined,
          audioTrack: audioTrack || undefined,
          isHost: false, // Remote participants are not "host" for local view
          avatarUrl: hostInfo.avatar_url || undefined,
        });
      }
    });
    
    setParticipants(gridParticipants);
    
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
        });
        
        room.on(RoomEvent.Connected, () => {
          console.log('[BattleGridWrapper] Room connected:', roomName);
          if (isActive) {
            setIsConnected(true);
            setError(null);
            updateParticipants();
            onRoomConnected?.();
          }
        });
        
        room.on(RoomEvent.Disconnected, (reason) => {
          console.log('[BattleGridWrapper] Room disconnected', { reason });
          if (isActive) {
            setIsConnected(false);
            onRoomDisconnected?.();
          }
        });

        room.on(RoomEvent.Reconnecting, () => {
          console.log('[BattleGridWrapper] Room reconnecting:', roomName);
        });

        room.on(RoomEvent.Reconnected, () => {
          console.log('[BattleGridWrapper] Room reconnected:', roomName);
          if (isActive) {
            updateParticipants();
          }
        });
        
        room.on(RoomEvent.ParticipantConnected, () => updateParticipants());
        room.on(RoomEvent.ParticipantDisconnected, () => updateParticipants());
        room.on(RoomEvent.TrackSubscribed, () => updateParticipants());
        room.on(RoomEvent.TrackUnsubscribed, () => updateParticipants());
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
  
  // Handle volume change
  const handleVolumeChange = useCallback((participantId: string, volume: number) => {
    setVolumes(prev => prev.map(v => 
      v.participantId === participantId ? { ...v, volume } : v
    ));
    
    // Apply volume to audio track
    const room = roomRef.current;
    if (!room) return;
    
    room.remoteParticipants.forEach((participant) => {
      const userId = participant.identity.replace(/^(u_|guest_)/, '');
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
      const userId = participant.identity.replace(/^(u_|guest_)/, '');
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
  
  return (
    <div className={`relative ${className}`}>
      {/* Timer overlay */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <BattleTimer
          remainingSeconds={remainingSeconds}
          phase={session.status === 'cooldown' ? 'cooldown' : 'active'}
          mode={session.mode}
          compact
        />
      </div>
      
      {/* Grid */}
      <MultiHostGrid
        participants={participants}
        mode="duo"
        maxSlots={2}
        currentUserId={currentUserId}
        volumes={volumes}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        isBattleMode={session.type === 'battle'}
      />
      
      {/* Loading overlay */}
      {!isConnected && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
            <p className="text-white/60 text-sm">Connecting to session...</p>
          </div>
        </div>
      )}
    </div>
  );
}
