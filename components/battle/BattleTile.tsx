/**
 * BattleTile - Single video tile for battle participants
 * Displays participant video, username, and status
 * Works with LiveKit tracks
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { BattleParticipant, BattleSide } from '@/types/battle';

interface BattleTileProps {
  participant: BattleParticipant;
  side: BattleSide;
  sideColor: string;
  isTeamLeader?: boolean;
  className?: string;
}

export default function BattleTile({ 
  participant, 
  side, 
  sideColor,
  isTeamLeader = false,
  className = '' 
}: BattleTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  // Attach video track to video element
  useEffect(() => {
    if (!videoRef.current || !participant.video_track) return;

    const videoElement = videoRef.current;
    const track = participant.video_track;

    // Attach MediaStreamTrack to video element
    if (track.mediaStreamTrack) {
      const stream = new MediaStream([track.mediaStreamTrack]);
      videoElement.srcObject = stream;
      videoElement.play().catch((err) => {
        console.error('[BattleTile] Video play error:', err);
      });
      setHasVideo(true);
    }

    return () => {
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    };
  }, [participant.video_track]);

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-lg bg-gray-900 ${className}`}>
      {/* Video */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          {participant.avatar_url ? (
            <img 
              src={participant.avatar_url} 
              alt={participant.username}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-white">
              {participant.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Team Leader Badge */}
      {isTeamLeader && (
        <div 
          className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-bold text-white"
          style={{ backgroundColor: sideColor }}
        >
          ★ LEADER
        </div>
      )}

      {/* Side Indicator */}
      <div 
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white"
        style={{ backgroundColor: sideColor }}
      >
        {side}
      </div>

      {/* Username */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="text-white text-sm font-semibold truncate">
          {participant.username}
        </div>
        <div className="flex gap-2 mt-1">
          {!participant.is_camera_enabled && (
            <span className="text-xs text-white/80">📷 Off</span>
          )}
          {!participant.is_mic_enabled && (
            <span className="text-xs text-white/80">🔇</span>
          )}
        </div>
      </div>

      {/* Platform Badge */}
      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white/70">
        {participant.platform === 'web' ? '💻' : '📱'}
      </div>
    </div>
  );
}

