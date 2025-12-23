'use client';

import { useState, useEffect, useRef } from 'react';
import GifterBadge from './GifterBadge';
import GiftModal from './GiftModal';
import MiniProfile from './MiniProfile';
import { useViewerHeartbeat } from '@/hooks/useViewerHeartbeat';
import { useLiveKit } from '@/hooks/useLiveKit';
import { RemoteTrack, TrackPublication, RemoteParticipant, Track } from 'livekit-client';
import { createClient } from '@/lib/supabase';

interface TileProps {
  streamerId: string;
  streamerUsername: string;
  streamerAvatar?: string;
  isLive: boolean; // is_published (actively streaming)
  isLiveAvailable: boolean; // live_available (in preview mode)
  viewerCount: number;
  gifterLevel: number;
  badgeName?: string;
  badgeColor?: string;
  slotIndex: number;
  liveStreamId?: number;
  onClose: () => void;
  onMute: () => void;
  isMuted: boolean;
  volume: number; // 0.0 to 1.0
  onVolumeChange: (volume: number) => void;
  isFullscreen?: boolean;
  onExpand?: () => void;
  onExitFullscreen?: () => void;
  onVolumeSliderToggle?: (isOpen: boolean) => void;
  onReplace?: () => void;
}

export default function Tile({
  streamerId,
  streamerUsername,
  streamerAvatar,
  isLive,
  isLiveAvailable,
  viewerCount,
  gifterLevel,
  badgeName,
  badgeColor,
  slotIndex,
  liveStreamId,
  onClose,
  onMute,
  isMuted,
  volume,
  onVolumeChange,
  isFullscreen = false,
  onExpand,
  onExitFullscreen,
  onVolumeSliderToggle,
  onReplace,
}: TileProps) {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);
  const [localPreviewStream, setLocalPreviewStream] = useState<MediaStream | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const supabase = createClient();

  // Room name: use "live_central" for now, or could be "live_stream_{liveStreamId}"
  const roomName = liveStreamId ? `live_stream_${liveStreamId}` : 'live_central';

  // Connect to LiveKit room ONLY when:
  // 1. Streamer is actually publishing (isLive = true, which means is_published)
  // 2. We have a valid streamer ID and liveStreamId
  // 3. Streamer ID is not empty/null
  // Note: For current user in preview mode, we don't connect (they see local preview)
  const shouldConnect = !!(
    isLive && // Only connect when actually publishing (is_published = true)
    liveStreamId !== undefined && 
    streamerId && 
    streamerId.trim() !== ''
  );

  const { room, isConnected } = useLiveKit({
    roomName,
    participantName: streamerUsername,
    canPublish: false,
    canSubscribe: true,
    enabled: shouldConnect,
    onTrackSubscribed: (track, publication, participant) => {
      // Only subscribe to tracks from the streamer
      if (participant.identity === streamerId) {
        if (track.kind === Track.Kind.Video) {
          setVideoTrack(track);
          // Attach video track to video element
          if (videoRef.current) {
            track.attach(videoRef.current);
          }
        } else if (track.kind === Track.Kind.Audio) {
          setAudioTrack(track);
          // Attach audio track to audio element
          if (audioRef.current) {
            track.attach(audioRef.current);
          }
        }
      }
    },
    onTrackUnsubscribed: (track, publication, participant) => {
      if (participant.identity === streamerId) {
        if (track.kind === Track.Kind.Video) {
          track.detach();
          setVideoTrack(null);
        } else if (track.kind === Track.Kind.Audio) {
          track.detach();
          setAudioTrack(null);
        }
      }
    },
  });

  // Check if this is the current user's tile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      setIsCurrentUser(user?.id === streamerId);
    });
  }, [streamerId, supabase]);

  // Start local preview when it's current user in preview mode (live_available but not published)
  // They should see themselves as live even when not broadcasting yet
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    if (isCurrentUser && isLiveAvailable && liveStreamId) {
      // Start local camera preview
      const startLocalPreview = async () => {
        try {
          console.log('Starting local preview for current user');
          stream = await navigator.mediaDevices.getUserMedia({
            video: true, // Use default video constraints
            audio: false, // Don't need audio for preview
          });
          console.log('Local preview stream obtained:', stream);
          setLocalPreviewStream(stream);
        } catch (err: any) {
          console.error('Error starting local preview:', err);
          // Try again with more permissive constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
            console.log('Local preview stream obtained with fallback constraints:', stream);
            setLocalPreviewStream(stream);
          } catch (fallbackErr) {
            console.error('Fallback preview also failed:', fallbackErr);
          }
        }
      };
      startLocalPreview();
    } else {
      // Stop local preview when not needed
      if (localPreviewStream) {
        console.log('Stopping local preview');
        localPreviewStream.getTracks().forEach(track => track.stop());
        setLocalPreviewStream(null);
      }
    }

    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (localPreviewStream) {
        localPreviewStream.getTracks().forEach(track => track.stop());
        setLocalPreviewStream(null);
      }
    };
  }, [isCurrentUser, isLiveAvailable, isLive, liveStreamId]);

  // Attach local preview stream to video element when both are ready
  useEffect(() => {
    if (localPreviewStream && previewVideoRef.current) {
      console.log('Attaching local preview stream to video element');
      previewVideoRef.current.srcObject = localPreviewStream;
      previewVideoRef.current.play()
        .then(() => {
          console.log('Local preview video playing');
        })
        .catch(err => {
          console.error('Error playing preview:', err);
        });
    } else if (!localPreviewStream && previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  }, [localPreviewStream]);

  // Attach video track when it becomes available
  useEffect(() => {
    if (videoTrack && videoRef.current) {
      videoTrack.attach(videoRef.current);
      return () => {
        videoTrack.detach();
      };
    }
  }, [videoTrack]);

  // Attach audio track and apply volume/mute
  useEffect(() => {
    if (audioTrack && audioRef.current) {
      audioTrack.attach(audioRef.current);
      audioRef.current.volume = isMuted ? 0 : volume;
      return () => {
        audioTrack.detach();
      };
    }
  }, [audioTrack, isMuted, volume]);

  // Manage viewer heartbeat when tile is active and not muted
  useViewerHeartbeat({
    liveStreamId: liveStreamId || 0,
    isActive: isActive && !isMuted,
    isUnmuted: !isMuted,
    isVisible: isVisible,
    isSubscribed: true,
    enabled: isLive && liveStreamId !== undefined && !isMuted,
  });

  // Track visibility for heartbeat
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );

    const element = document.querySelector(`[data-tile-id="${slotIndex}"]`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [slotIndex]);

  // Apply volume to audio element when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Determine tile state
  // For current user: show as 'live' when live_available (even if not published yet)
  // For others: show as 'live' only when actually publishing
  const tileState = isCurrentUser
    ? (isLiveAvailable ? 'live' : 'offline') // Current user sees themselves as live when available
    : (isLive ? 'live' : isLiveAvailable ? 'preview' : 'offline'); // Others see preview when available but not publishing

  return (
    <div
      data-tile-id={slotIndex}
      className={`
        relative ${isFullscreen ? 'w-full h-full' : 'aspect-[3/2]'} rounded-lg overflow-hidden group
        border-2 transition-all duration-200
        ${
          tileState === 'live'
            ? 'border-red-500 shadow-lg shadow-red-500/20'
            : tileState === 'preview'
            ? 'border-yellow-500/50 border-dashed'
            : 'border-gray-300 dark:border-gray-700'
        }
        ${isMuted ? 'opacity-60' : ''}
      `}
    >
      {/* Video/Stream Area */}
      <div className="w-full h-full flex items-center justify-center bg-gray-900 relative overflow-hidden">
        {/* LiveKit Video Element - Only show when we have a video track (published) */}
        {isLive && videoTrack && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover ${isMuted ? 'grayscale' : ''}`}
            autoPlay
            playsInline
            muted={isMuted}
          />
        )}
        
        {/* Local Preview - Show when it's current user in preview mode (waiting for viewers) */}
        {isCurrentUser && isLiveAvailable && !isLive && (
          <video
            ref={previewVideoRef}
            className="absolute inset-0 w-full h-full object-cover bg-black"
            autoPlay
            playsInline
            muted
          />
        )}
        
        {/* Fallback: Avatar or placeholder (when no video track or preview) */}
        {(!isLive || !videoTrack) && !(isCurrentUser && isLiveAvailable && !isLive && localPreviewStream) && (
          <div className="absolute inset-0 w-full h-full">
            {streamerAvatar ? (
              <img
                src={streamerAvatar}
                alt={streamerUsername}
                className={`w-full h-full object-cover ${isMuted ? 'grayscale' : ''}`}
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-gray-500 text-4xl font-bold">{streamerUsername.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        )}

        {/* Audio element for LiveKit audio track */}
        {isLive && (
          <audio
            ref={audioRef}
            autoPlay
            playsInline
            className="hidden"
          />
        )}

        {/* Preview Mode Overlay - Only show for other users (not current user) */}
        {tileState === 'preview' && !isCurrentUser && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="text-center text-white">
              <div className="text-sm font-medium mb-1">Preview Mode</div>
              <div className="text-xs opacity-75">Waiting for viewers...</div>
            </div>
          </div>
        )}
        
        {/* No preview overlay for current user - they see themselves as live */}

        {/* Loading indicator when connecting */}
        {isLive && !isConnected && !videoTrack && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="text-center text-white">
              <div className="text-sm font-medium mb-1">Connecting...</div>
            </div>
          </div>
        )}
      </div>

      {/* State Indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        {tileState === 'live' && (
          <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
        {tileState === 'preview' && !isCurrentUser && (
          <div className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
            <span className="w-2 h-2 bg-white rounded-full" />
            PREVIEW
          </div>
        )}
      </div>

      {/* Stats Overlay - Show viewer count (even if 0 for current user when live) */}
      {(viewerCount > 0 || (isCurrentUser && isLiveAvailable)) && (
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs z-20">
          👁️ {viewerCount}
        </div>
      )}

      {/* Muted Indicator */}
      {isMuted && (
        <div className="absolute top-12 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs z-20">
          🔇 Muted
        </div>
      )}

      {/* Bottom Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMiniProfile(true)}
              className="text-white font-medium text-sm truncate hover:text-blue-300 transition cursor-pointer"
            >
              {streamerUsername}
            </button>
            <GifterBadge
              level={gifterLevel}
              badgeName={badgeName}
              badgeColor={badgeColor}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-10 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex gap-1">
          {onExpand && !isFullscreen && (
            <button
              onClick={onExpand}
              className="p-1.5 bg-black/50 text-white rounded hover:bg-blue-500/80 transition"
              title="Expand to Fullscreen"
            >
              ⛶
            </button>
          )}
          {isFullscreen && onExitFullscreen && (
            <button
              onClick={onExitFullscreen}
              className="p-1.5 bg-black/50 text-white rounded hover:bg-red-500/80 transition"
              title="Exit Fullscreen"
            >
              ✕
            </button>
          )}
          <button
            onClick={onMute}
            className={`p-1.5 rounded hover:bg-black/70 transition ${
              isMuted
                ? 'bg-red-500/80 text-white'
                : 'bg-black/50 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={() => {
              const newState = !showVolumeSlider;
              setShowVolumeSlider(newState);
              onVolumeSliderToggle?.(newState);
            }}
            className="p-1.5 bg-black/50 text-white rounded hover:bg-black/70 transition"
            title="Volume Control"
          >
            🔊
          </button>
          {!isFullscreen && (
            <>
              {onReplace && (
                <button
                  onClick={onReplace}
                  className="p-1.5 bg-black/50 text-white rounded hover:bg-blue-500/80 transition"
                  title="Replace Streamer"
                >
                  🔄
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 bg-black/50 text-white rounded hover:bg-red-500/80 transition"
                title="Close"
              >
                ✕
              </button>
            </>
          )}
        </div>
        
        {/* Volume Slider - Shows when volume button is clicked */}
        {showVolumeSlider && (
          <div 
            className="bg-black/90 backdrop-blur-sm rounded-lg p-3 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2 min-w-[120px]">
              <span className="text-white text-xs">🔇</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  onVolumeChange(newVolume);
                  if (newVolume === 0 && !isMuted) {
                    onMute(); // Auto-mute at 0
                  } else if (newVolume > 0 && isMuted) {
                    onMute(); // Auto-unmute above 0
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={(e) => e.preventDefault()}
                className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                }}
              />
              <span className="text-white text-xs w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gift Button */}
      <button
        onClick={() => setShowGiftModal(true)}
        className="absolute bottom-2 left-2 px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >
        💎 Gift
      </button>

      {/* Gift Modal */}
      {showGiftModal && (
        <GiftModal
          recipientId={streamerId}
          recipientUsername={streamerUsername}
          slotIndex={slotIndex}
          liveStreamId={liveStreamId}
          onGiftSent={() => {
            setShowGiftModal(false);
          }}
          onClose={() => setShowGiftModal(false)}
        />
      )}

      {/* Mini Profile Modal */}
      {showMiniProfile && (
        <MiniProfile
          profileId={streamerId}
          username={streamerUsername}
          avatarUrl={streamerAvatar}
          gifterLevel={gifterLevel}
          badgeName={badgeName}
          badgeColor={badgeColor}
          isLive={isLive}
          onClose={() => setShowMiniProfile(false)}
          onLeaveChannel={() => {
            onClose();
            setShowMiniProfile(false);
          }}
          onDisconnect={() => {
            onClose();
            setShowMiniProfile(false);
          }}
        />
      )}
    </div>
  );
}

