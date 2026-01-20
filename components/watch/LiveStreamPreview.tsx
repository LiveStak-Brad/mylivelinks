'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX } from 'lucide-react';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';
import { createClient } from '@/lib/supabase';
import { parseLiveLocation, getLiveJoinTargetWeb } from '@/lib/liveJoinTarget';

interface LiveStreamPreviewProps {
  streamerProfileId: string;
  streamerUsername: string;
  displayName: string;
  streamingMode: 'solo' | 'group';
  roomKey?: string; // For group streams
}

export function LiveStreamPreview({ streamerProfileId, streamerUsername, displayName, streamingMode, roomKey }: LiveStreamPreviewProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const isConnectingRef = useRef(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const handleEnterLive = () => {
    // Use canonical routing logic
    const location = parseLiveLocation({
      streamingMode,
      username: streamerUsername,
      authorId: streamerProfileId,
      roomKey,
    });

    if (!location) {
      console.error('[LiveStreamPreview] Failed to parse live location');
      return;
    }

    const target = getLiveJoinTargetWeb(location);
    if (!target) {
      console.error('[LiveStreamPreview] Failed to get join target');
      return;
    }

    router.push(target.path);
  };

  useEffect(() => {
    let mounted = true;
    let promptTimer: NodeJS.Timeout;

    const disconnectRoom = async () => {
      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        roomRef.current = null;
      }
    };

    const connectToRoom = async () => {
      // Prevent double connections
      if (isConnectingRef.current) {
        console.log('[LiveStreamPreview] Already connecting, skipping');
        return;
      }
      isConnectingRef.current = true;

      // Clean up any existing connection first
      await disconnectRoom();

      try {
        // Get current user for auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('[LiveStreamPreview] Auth error:', authError);
          isConnectingRef.current = false;
          return;
        }

        // Get session token
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
          console.error('[LiveStreamPreview] No access token');
          isConnectingRef.current = false;
          return;
        }

        if (!mounted) {
          isConnectingRef.current = false;
          return;
        }

        // Room name format: solo_<profile_id> for solo, live_central for group
        const roomName = streamingMode === 'group' ? 'live_central' : `solo_${streamerProfileId}`;
        const participantName = `preview_${user.id.slice(0, 8)}_${Date.now()}`;

        console.log('[LiveStreamPreview] Connecting to room:', roomName);

        // Get LiveKit token
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName,
            participantName,
            canPublish: false,
            canSubscribe: true,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[LiveStreamPreview] Token error:', response.status, errorData);
          isConnectingRef.current = false;
          return;
        }

        const { token, url } = await response.json();
        if (!token || !url) {
          console.error('[LiveStreamPreview] Invalid token response');
          isConnectingRef.current = false;
          return;
        }

        if (!mounted) {
          isConnectingRef.current = false;
          return;
        }

        // Create and connect to LiveKit room
        const { Room: LiveKitRoom } = await import('livekit-client');
        const room = new LiveKitRoom({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        // Attach video track helper
        const attachVideoTrack = (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video && videoRef.current && mounted) {
            console.log('[LiveStreamPreview] Attaching video track');
            track.attach(videoRef.current);
            setHasVideo(true);
          }
        };

        // Handle track subscriptions
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          console.log('[LiveStreamPreview] Track subscribed:', track.kind);
          attachVideoTrack(track);
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach();
        });

        // Connect to room
        await room.connect(url, token);
        console.log('[LiveStreamPreview] Connected to room, participants:', room.remoteParticipants.size);

        if (!mounted) {
          room.disconnect();
          isConnectingRef.current = false;
          return;
        }

        // Attach any existing tracks (important for reconnection)
        room.remoteParticipants.forEach((participant) => {
          console.log('[LiveStreamPreview] Checking participant:', participant.identity, 'tracks:', participant.trackPublications.size);
          participant.trackPublications.forEach((publication) => {
            if (publication.track) {
              attachVideoTrack(publication.track as RemoteTrack);
            }
          });
        });

        isConnectingRef.current = false;

        // Show "Tap to enter" prompt after 15 seconds
        promptTimer = setTimeout(() => {
          if (mounted) {
            setShowPrompt(true);
          }
        }, 15000);

      } catch (err) {
        console.error('[LiveStreamPreview] Error:', err);
        isConnectingRef.current = false;
      }
    };

    // Small delay to avoid race conditions with React strict mode
    const connectTimer = setTimeout(connectToRoom, 100);

    return () => {
      mounted = false;
      clearTimeout(connectTimer);
      if (promptTimer) clearTimeout(promptTimer);
      isConnectingRef.current = false;
      disconnectRoom();
    };
  }, [streamerProfileId, supabase]);

  return (
    <div 
      className="absolute inset-0 cursor-pointer z-10"
      onClick={handleEnterLive}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: hasVideo ? 'block' : 'none' }}
      />
      
      {/* Volume Toggle Button - Top Right */}
      {hasVideo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
          className="absolute top-16 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      )}
      
      {/* Gentle edge gradients */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.3) 100%), linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* Tap to enter prompt after 15 seconds */}
      {showPrompt && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 pointer-events-none"
        >
          <div className="text-center">
            <div className="text-white text-2xl font-bold mb-2">
              {displayName} is live
            </div>
            <div className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-white font-semibold text-lg shadow-lg">
              Tap to Join
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
