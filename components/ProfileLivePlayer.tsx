'use client';

import { useEffect, useState, useRef } from 'react';
import { Room, RemoteTrack, RemoteParticipant, Track } from 'livekit-client';
import { createClient } from '@/lib/supabase';

interface ProfileLivePlayerProps {
  profileId: string;
  username: string;
  className?: string;
}

/**
 * Profile Live Video Player
 * Shows user's live stream directly on their profile when they're broadcasting
 */
export default function ProfileLivePlayer({
  profileId,
  username,
  className = '',
}: ProfileLivePlayerProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const supabase = createClient();

  useEffect(() => {
    connectToRoom();
    return () => {
      disconnect();
    };
  }, [profileId]);

  // Attach tracks to video/audio elements
  useEffect(() => {
    if (videoTrack && videoRef.current) {
      videoTrack.attach(videoRef.current);
    }
    return () => {
      if (videoTrack && videoRef.current) {
        videoTrack.detach(videoRef.current);
      }
    };
  }, [videoTrack]);

  useEffect(() => {
    if (audioTrack && audioRef.current) {
      audioTrack.attach(audioRef.current);
    }
    return () => {
      if (audioTrack && audioRef.current) {
        audioTrack.detach(audioRef.current);
      }
    };
  }, [audioTrack]);

  const connectToRoom = async () => {
    try {
      console.log('[PROFILE_LIVE] Connecting for user:', profileId);
      
      // Get LiveKit token as viewer
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: 'live_central',
          canPublish: false, // Viewer only
        }),
      });

      const { token, url } = await response.json();

      if (!token || !url) {
        console.error('[PROFILE_LIVE] No token received');
        return;
      }

      // Connect to LiveKit room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      await newRoom.connect(url, token);
      setRoom(newRoom);
      setIsConnected(true);

      console.log('[PROFILE_LIVE] Connected to room, participants:', newRoom.remoteParticipants.size);

      // Subscribe to remote participant tracks (the streamer)
      subscribeToParticipant(newRoom, profileId);

      // Listen for new participants
      newRoom.on('participantConnected', (participant: RemoteParticipant) => {
        console.log('[PROFILE_LIVE] Participant connected:', participant.identity);
        const participantUserId = extractUserId(participant.identity);
        if (participantUserId === profileId) {
          console.log('[PROFILE_LIVE] Target user connected!');
          subscribeToParticipant(newRoom, profileId);
        }
      });

      // Handle track subscribed
      newRoom.on('trackSubscribed', (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        console.log('[PROFILE_LIVE] Track subscribed:', track.kind, 'from', participant.identity);
        const participantUserId = extractUserId(participant.identity);
        if (participantUserId === profileId) {
          console.log('[PROFILE_LIVE] Track is from target user!');
          if (track.kind === Track.Kind.Video) {
            console.log('[PROFILE_LIVE] Setting video track');
            setVideoTrack(track);
          } else if (track.kind === Track.Kind.Audio) {
            console.log('[PROFILE_LIVE] Setting audio track');
            setAudioTrack(track);
          }
        }
      });

      // Handle track unsubscribed
      newRoom.on('trackUnsubscribed', (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        const participantUserId = extractUserId(participant.identity);
        if (participantUserId === profileId) {
          if (track.kind === Track.Kind.Video) {
            setVideoTrack(null);
          } else if (track.kind === Track.Kind.Audio) {
            setAudioTrack(null);
          }
        }
      });

    } catch (error) {
      console.error('[PROFILE_LIVE] Connection error:', error);
    }
  };

  const subscribeToParticipant = (room: Room, userId: string) => {
    const participants = Array.from(room.remoteParticipants.values());
    
    console.log('[PROFILE_LIVE] Looking for user:', userId);
    console.log('[PROFILE_LIVE] Available participants:', participants.map(p => ({
      identity: p.identity,
      extractedId: extractUserId(p.identity),
      hasVideo: Array.from(p.trackPublications.values()).some(pub => pub.kind === Track.Kind.Video),
      hasAudio: Array.from(p.trackPublications.values()).some(pub => pub.kind === Track.Kind.Audio)
    })));
    
    for (const participant of participants) {
      const participantUserId = extractUserId(participant.identity);
      
      console.log('[PROFILE_LIVE] Checking participant:', participantUserId, 'vs', userId);
      
      if (participantUserId === userId) {
        console.log('[PROFILE_LIVE] Found matching participant!');
        
        // Subscribe to video track
        const videoPublication = Array.from(participant.trackPublications.values()).find(
          pub => pub.kind === Track.Kind.Video
        );
        if (videoPublication && videoPublication.track) {
          console.log('[PROFILE_LIVE] Found video track, subscribing...');
          setVideoTrack(videoPublication.track as RemoteTrack);
        } else {
          console.log('[PROFILE_LIVE] No video track found');
        }

        // Subscribe to audio track
        const audioPublication = Array.from(participant.trackPublications.values()).find(
          pub => pub.kind === Track.Kind.Audio
        );
        if (audioPublication && audioPublication.track) {
          console.log('[PROFILE_LIVE] Found audio track, subscribing...');
          setAudioTrack(audioPublication.track as RemoteTrack);
        } else {
          console.log('[PROFILE_LIVE] No audio track found');
        }
        break;
      }
    }
  };

  const extractUserId = (identity: string): string => {
    // Identity format: u_<userId>:web:<deviceId>:<sessionId>
    if (identity.startsWith('u_')) {
      const parts = identity.split(':');
      if (parts.length >= 1) {
        return parts[0].substring(2); // Remove "u_" prefix
      }
    }
    return identity;
  };

  const disconnect = () => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setVideoTrack(null);
      setAudioTrack(null);
    }
  };

  return (
    <div className={`relative w-full bg-black ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />

      {/* Audio Element (hidden) */}
      <audio ref={audioRef} autoPlay />

      {/* Loading indicator */}
      {isConnected && !videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Connecting to live stream...</p>
          </div>
        </div>
      )}

      {/* Live indicator */}
      {videoTrack && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="font-semibold text-sm">LIVE</span>
        </div>
      )}
    </div>
  );
}

