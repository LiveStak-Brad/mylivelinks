'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { RemoteTrack, Track } from 'livekit-client';
import { LIVEKIT_ROOM_NAME } from '@/lib/livekit-constants';

interface ViewerVideoPreviewProps {
  viewerId: string;
  viewerUsername: string;
  liveStreamId: number;
  isLive: boolean; // is_published (actively streaming)
}

export default function ViewerVideoPreview({
  viewerId,
  viewerUsername,
  liveStreamId,
  isLive,
}: ViewerVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null);

  // Use single global room for all streamers
  const roomName = LIVEKIT_ROOM_NAME;

  // Only connect if the viewer is actually publishing (isLive = true)
  const { room, isConnected } = useLiveKit({
    roomName,
    participantName: `viewer-${viewerId}`,
    canPublish: false,
    canSubscribe: true,
    enabled: isLive && !!liveStreamId,
    onTrackSubscribed: (track, publication, participant) => {
      // Only subscribe to tracks from this specific viewer
      // Participant identity should match the viewer's profile_id (UUID)
      if (participant.identity === viewerId && track.kind === Track.Kind.Video) {
        console.log('Viewer video track subscribed:', { viewerId, participantIdentity: participant.identity });
        setVideoTrack(track);
        // Attach video track to video element
        if (videoRef.current) {
          track.attach(videoRef.current);
          videoRef.current.play().catch(err => {
            console.error('Error playing viewer video:', err);
          });
        }
      }
    },
    onTrackUnsubscribed: (track) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        setVideoTrack(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoTrack) {
        videoTrack.detach();
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [videoTrack]);

  // Update video element when track changes
  useEffect(() => {
    if (videoRef.current && videoTrack) {
      videoTrack.attach(videoRef.current);
      videoRef.current.play().catch(err => {
        console.error('Error playing viewer video:', err);
      });
    }
  }, [videoTrack]);

  if (!isLive) {
    return null; // Don't show video if not actually streaming
  }

  return (
    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0 border-2 border-red-500">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror for webcam effect
      />
      {!videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* Live indicator */}
      <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full">
        <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
      </div>
    </div>
  );
}

