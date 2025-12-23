'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import GifterBadge from './GifterBadge';
import GiftModal from './GiftModal';
import MiniProfile from './MiniProfile';
import { useViewerHeartbeat } from '@/hooks/useViewerHeartbeat';
import { RemoteTrack, TrackPublication, RemoteParticipant, Track, RoomEvent, Room } from 'livekit-client';
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
  sharedRoom?: Room | null; // Shared LiveKit room connection
  isRoomConnected?: boolean; // Whether shared room is connected
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
  sharedRoom,
  isRoomConnected = false,
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

  // Track subscription state to prevent re-subscriptions
  const subscriptionRef = useRef<{ streamerId: string | null; subscribed: boolean }>({ streamerId: null, subscribed: false });

  // Use shared room connection instead of creating our own
  // Subscribe to tracks from the streamer when room is connected
  // CRITICAL: Only depend on streamerId and liveStreamId to prevent re-subscription loops
  // CRITICAL: Don't return early if live_available=true but is_published=false - wait for tracks
  useEffect(() => {
    // Must have room, connection, liveStreamId, streamerId, and streamer must be live_available
    if (!sharedRoom || !isRoomConnected || !liveStreamId || !streamerId || !isLiveAvailable) {
      // Only clear tracks if streamer is no longer live_available (not just because room disconnected temporarily)
      if (!isLiveAvailable && subscriptionRef.current.subscribed && subscriptionRef.current.streamerId === streamerId) {
        setVideoTrack(null);
        setAudioTrack(null);
        subscriptionRef.current.subscribed = false;
        subscriptionRef.current.streamerId = null;
      }
      return;
    }
    
    // If streamer is live_available but not yet published, still try to subscribe (tracks may appear soon)
    // Heartbeat is already running, which will trigger publishing

    // Skip if already subscribed to this streamer (identity check only)
    if (subscriptionRef.current.subscribed && subscriptionRef.current.streamerId === streamerId) {
      return;
    }

    // Mark as subscribed
    subscriptionRef.current.subscribed = true;
    subscriptionRef.current.streamerId = streamerId;

    const handleTrackSubscribed = (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
      // Only subscribe to tracks from this specific streamer
      if (participant.identity === streamerId) {
        if (track.kind === Track.Kind.Video) {
          setVideoTrack(track);
          if (videoRef.current) {
            track.attach(videoRef.current);
          }
        } else if (track.kind === Track.Kind.Audio) {
          setAudioTrack(track);
          if (audioRef.current) {
            track.attach(audioRef.current);
          }
        }
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
      if (participant.identity === streamerId) {
        if (track.kind === Track.Kind.Video) {
          track.detach();
          setVideoTrack(null);
        } else if (track.kind === Track.Kind.Audio) {
          track.detach();
          setAudioTrack(null);
        }
      }
    };

    // Subscribe to existing tracks
    const checkForTracks = () => {
      sharedRoom.remoteParticipants.forEach((participant) => {
        if (participant.identity === streamerId) {
          participant.trackPublications.forEach((publication) => {
            if (publication.track) {
              handleTrackSubscribed(publication.track as RemoteTrack, publication, participant);
            }
          });
        }
      });
    };
    
    // Check immediately
    checkForTracks();
    
    // If tracks not found and streamer is live_available but not yet published, retry
    // This handles the race condition where heartbeat triggers publishing but tracks aren't ready yet
    let retryAttempts = 0;
    const maxRetryAttempts = 10;
    const retryInterval = 600; // 600ms between retries = ~6 seconds total
    
    const retryTimer = setInterval(() => {
      // Stop retrying if conditions changed
      if (!sharedRoom || !isRoomConnected || !liveStreamId || !streamerId || !isLiveAvailable) {
        clearInterval(retryTimer);
        return;
      }
      
      // Stop if we already have tracks
      if (videoTrack || audioTrack) {
        clearInterval(retryTimer);
        return;
      }
      
      retryAttempts++;
      if (retryAttempts >= maxRetryAttempts) {
        clearInterval(retryTimer);
        return;
      }
      
      // Check for tracks again
      checkForTracks();
    }, retryInterval);

    // Listen for new tracks
    sharedRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    sharedRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      clearInterval(retryTimer);
      sharedRoom.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      sharedRoom.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      // Only mark as unsubscribed if this is the same streamer
      if (subscriptionRef.current.streamerId === streamerId) {
        subscriptionRef.current.subscribed = false;
        subscriptionRef.current.streamerId = null;
      }
    };
    // CRITICAL: Depend on streamerId and liveStreamId for identity, isLive for publishing state
    // The subscriptionRef guard prevents re-subscription when streamerId hasn't changed
  }, [sharedRoom, isRoomConnected, isLive, liveStreamId, streamerId]);

  // Check if this is the current user's tile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      setIsCurrentUser(user?.id === streamerId);
    });
  }, [streamerId, supabase]);

  // Start local preview when it's current user and live_available
  // Show preview immediately - even if not published yet, or if published but videoTrack not available yet
  // This ensures streamer always sees themselves with no flicker or "Connecting..." state
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    // Show local preview when:
    // 1. It's the current user
    // 2. They're live_available
    // 3. Either not published yet OR published but videoTrack not available yet
    const shouldShowPreview = isCurrentUser && isLiveAvailable && liveStreamId && (!isLive || !videoTrack);
    
    if (shouldShowPreview) {
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
      // Stop local preview when not needed (when videoTrack is available and published)
      if (localPreviewStream && isLive && videoTrack) {
        console.log('Stopping local preview - videoTrack is now available');
        localPreviewStream.getTracks().forEach(track => track.stop());
        setLocalPreviewStream(null);
      }
    }

    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (localPreviewStream && (!isCurrentUser || !isLiveAvailable)) {
        localPreviewStream.getTracks().forEach(track => track.stop());
        setLocalPreviewStream(null);
      }
    };
  }, [isCurrentUser, isLiveAvailable, isLive, liveStreamId, videoTrack]);

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

  // Attach video track when it becomes available - use ref to prevent re-attachment
  const attachedVideoTrackRef = useRef<RemoteTrack | null>(null);
  useEffect(() => {
    if (videoTrack && videoRef.current) {
      // Only attach if it's a different track
      if (attachedVideoTrackRef.current !== videoTrack) {
        // Detach previous track if exists
        if (attachedVideoTrackRef.current && videoRef.current) {
          attachedVideoTrackRef.current.detach();
        }
        videoTrack.attach(videoRef.current);
        attachedVideoTrackRef.current = videoTrack;
      }
    } else if (!videoTrack && attachedVideoTrackRef.current && videoRef.current) {
      // Clean up if track is removed
      attachedVideoTrackRef.current.detach();
      attachedVideoTrackRef.current = null;
    }
    
    return () => {
      if (attachedVideoTrackRef.current && videoRef.current) {
        attachedVideoTrackRef.current.detach();
        attachedVideoTrackRef.current = null;
      }
    };
  }, [videoTrack]);

  // Attach audio track and apply volume/mute - use ref to prevent re-attachment
  const attachedAudioTrackRef = useRef<RemoteTrack | null>(null);
  useEffect(() => {
    if (audioTrack && audioRef.current) {
      // Only attach if it's a different track
      if (attachedAudioTrackRef.current !== audioTrack) {
        // Detach previous track if exists
        if (attachedAudioTrackRef.current && audioRef.current) {
          attachedAudioTrackRef.current.detach();
        }
        audioTrack.attach(audioRef.current);
        attachedAudioTrackRef.current = audioTrack;
      }
      // Always update volume/mute
      audioRef.current.volume = isMuted ? 0 : volume;
    } else if (!audioTrack && attachedAudioTrackRef.current && audioRef.current) {
      // Clean up if track is removed
      attachedAudioTrackRef.current.detach();
      attachedAudioTrackRef.current = null;
    }
    
    return () => {
      if (attachedAudioTrackRef.current && audioRef.current) {
        attachedAudioTrackRef.current.detach();
        attachedAudioTrackRef.current = null;
      }
    };
  }, [audioTrack, isMuted, volume]);

  // Manage viewer heartbeat when tile is active and not muted
  // CRITICAL: Enable heartbeat for ALL live_available streamers (not just is_published)
  // This ensures that when a viewer places a streamer in a tile, heartbeat creates active_viewers entry
  // which triggers is_published to become true, which then starts publishing
  const shouldSendHeartbeat = !!(
    liveStreamId !== undefined && 
    !isMuted &&
    isLiveAvailable // Enable for ANY live_available streamer (published or waiting)
  );
  
  useViewerHeartbeat({
    liveStreamId: liveStreamId || 0,
    isActive: isActive && !isMuted,
    isUnmuted: !isMuted,
    isVisible: isVisible,
    isSubscribed: true,
    enabled: shouldSendHeartbeat,
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

  // Determine tile state - ALWAYS show as 'live' when live_available (hide preview mode from users)
  // Preview mode is internal technical state only - users should never see it
  const tileState = isLiveAvailable ? 'live' : 'offline';

  return (
    <div
      data-tile-id={slotIndex}
      className={`
        relative ${isFullscreen ? 'w-full h-full' : 'aspect-[3/2]'} rounded-lg overflow-hidden group
        border-2 transition-all duration-200
        ${
          tileState === 'live'
            ? 'border-red-500 shadow-lg shadow-red-500/20'
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
        
        {/* Local Preview - Show when it's current user and live_available (even if not published yet, or published but videoTrack not available) */}
        {isCurrentUser && isLiveAvailable && localPreviewStream && (!isLive || !videoTrack) && (
          <video
            ref={previewVideoRef}
            className="absolute inset-0 w-full h-full object-cover bg-black"
            autoPlay
            playsInline
            muted
          />
        )}
        
        {/* Fallback: Avatar or placeholder (when no video track or preview) */}
        {(!isLive || !videoTrack) && !(isCurrentUser && isLiveAvailable && localPreviewStream) && (
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

        {/* No preview overlays - preview mode is invisible to users */}
        {/* No "Connecting..." UI - streamer should never see this */}
      </div>

      {/* State Indicator - Always show LIVE when live_available (hide preview mode) */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        {tileState === 'live' && (
          <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
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

