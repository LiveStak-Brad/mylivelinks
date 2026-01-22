/**
 * ViewerBattleGrid - Lightweight grid for viewers watching battle/cohost sessions
 * 
 * Unlike BattleGridWrapper (for hosts), this component:
 * - Does NOT create its own room connection (uses parent's connection)
 * - Does NOT manage publishing
 * - Simply renders tracks from the existing room
 * - Minimal overhead, no complex host UI
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { Room, Track, RemoteTrack, RoomEvent, RemoteParticipant } from 'livekit-client';
import GridTile, { GridTileParticipant } from './battle/GridTile';

interface ViewerBattleGridProps {
  room: Room | null;
  className?: string;
}

export default function ViewerBattleGrid({ room, className = '' }: ViewerBattleGridProps) {
  const [participants, setParticipants] = useState<GridTileParticipant[]>([]);
  
  // Update participants when room changes or tracks update
  useEffect(() => {
    if (!room) {
      console.log('[ViewerBattleGrid] No room provided');
      setParticipants([]);
      return;
    }
    
    console.log('[ViewerBattleGrid] Room state:', {
      state: room.state,
      remoteParticipants: room.remoteParticipants.size,
      participants: Array.from(room.remoteParticipants.values()).map(p => ({
        identity: p.identity,
        tracks: p.trackPublications.size,
      })),
    });
    
    const updateParticipants = () => {
      const tracks: GridTileParticipant[] = [];
      
      console.log('[ViewerBattleGrid] Updating participants, remote count:', room.remoteParticipants.size);
      
      // Add all remote participants (hosts in the battle/cohost)
      room.remoteParticipants.forEach((participant: RemoteParticipant) => {
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
        
        // Extract clean name from identity
        const identity = participant.identity;
        const name = identity.replace(/^u_/, '').split(':')[0];
        
        console.log('[ViewerBattleGrid] Adding participant:', {
          identity,
          name: participant.name || name,
          hasVideo: !!videoTrack,
          hasAudio: !!audioTrack,
        });
        
        tracks.push({
          id: participant.sid,
          name: participant.name || name,
          videoTrack,
          audioTrack,
        });
      });
      
      console.log('[ViewerBattleGrid] Total participants to render:', tracks.length);
      setParticipants(tracks);
    };
    
    // Initial update
    updateParticipants();
    
    // Listen for track changes
    room.on(RoomEvent.TrackSubscribed, updateParticipants);
    room.on(RoomEvent.TrackUnsubscribed, updateParticipants);
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    
    return () => {
      room.off(RoomEvent.TrackSubscribed, updateParticipants);
      room.off(RoomEvent.TrackUnsubscribed, updateParticipants);
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
    };
  }, [room]);
  
  if (!room) {
    return (
      <div className={`flex items-center justify-center bg-black/90 ${className}`}>
        <p className="text-white/60">Connecting to session...</p>
      </div>
    );
  }
  
  if (participants.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-black/90 ${className}`}>
        <div className="text-center">
          <p className="text-white/60">Waiting for hosts...</p>
          <p className="text-white/40 text-sm mt-2">
            Room: {room.state} | Participants: {room.remoteParticipants.size}
          </p>
        </div>
      </div>
    );
  }
  
  // Simple 2-column grid for cohost/battle
  const gridCols = participants.length <= 2 ? 'grid-cols-2' : participants.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';
  
  console.log('[ViewerBattleGrid] RENDERING GRID with', participants.length, 'participants');
  
  return (
    <div className={`grid ${gridCols} gap-1 w-full h-full bg-red-500/20 ${className}`}>
      <div className="absolute top-4 left-4 z-50 bg-green-500 text-white px-4 py-2 rounded">
        VIEWER GRID: {participants.length} hosts
      </div>
      {participants.map((p) => (
        <GridTile
          key={p.id}
          participant={p}
          isMuted={false}
          volume={0.7}
          onVolumeChange={(participantId: string, volume: number) => {}}
          onMuteToggle={(participantId: string) => {}}
        />
      ))}
    </div>
  );
}
