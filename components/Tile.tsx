'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Gift, Heart, Maximize2, Minimize2, Volume2, VolumeX, X } from 'lucide-react';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';
import GiftModal from './GiftModal';
import MiniProfile from './MiniProfile';
import GiftAnimation from './GiftAnimation';
import { useViewerHeartbeat } from '@/hooks/useViewerHeartbeat';
import { useDailyLeaderboardRank } from '@/hooks/useDailyLeaderboardRank';
import { RemoteTrack, TrackPublication, RemoteParticipant, Track, RoomEvent, Room } from 'livekit-client';
import { createClient } from '@/lib/supabase';
import { useLiveLike, useLiveViewTracking } from '@/lib/trending-hooks';

interface GiftAnimationData {
  id: string;
  giftName: string;
  giftIcon?: string;
  giftAnimationUrl?: string | null;
  senderUsername: string;
  coinAmount: number;
}

interface TileProps {
  streamerId: string;
  streamerUsername: string;
  streamerAvatar?: string;
  isLive: boolean; // Derived from track publications only (no preview mode)
  viewerCount: number;
  gifterStatus?: GifterStatus | null;
  slotIndex: number;
  liveStreamId?: number;
  roomId?: string; // NEW: Room ID for room-specific leaderboards
  trendingRank?: number; // NEW: Trending position (1 = top)
  sharedRoom?: Room | null; // Shared LiveKit room connection
  isRoomConnected?: boolean; // Whether shared room is connected
  isCurrentUserPublishing?: boolean; // NEW: Whether current user is publishing (for echo prevention)
  videoTrack?: any | null; // PHASE 4: Receive video track from parent (centralized management)
  audioTrack?: any | null; // PHASE 4: Receive audio track from parent (centralized management)
  compactMode?: boolean;
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
  viewerCount,
  gifterStatus,
  slotIndex,
  liveStreamId,
  roomId,
  trendingRank,
  sharedRoom,
  isRoomConnected = false,
  isCurrentUserPublishing = false,
  videoTrack = null, // PHASE 4: Receive from parent
  audioTrack = null, // PHASE 4: Receive from parent
  compactMode = false,
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
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9); // Track video orientation
  const tileContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // PHASE 4: videoTrack and audioTrack now received as props
  const [activeGiftAnimations, setActiveGiftAnimations] = useState<GiftAnimationData[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [showLikePop, setShowLikePop] = useState(false);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  const supabase = createClient();
  const shouldUseCompact = false;
  const isSelfTile = isCurrentUserPublishing && streamerId;
  const isCurrentUser = user?.id === streamerId;
  const gridIconSizeClass = compactMode ? 'w-4 h-4' : 'w-5 h-5';
  const gridNameMaxWidthClass = compactMode ? 'max-w-[55%]' : 'max-w-[70%]';

  const [giftOverlayScale, setGiftOverlayScale] = useState(1);

  useEffect(() => {
    const el = tileContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const compute = () => {
      const rect = el.getBoundingClientRect();
      const minDim = Math.min(rect.width, rect.height);
      if (!minDim || !isFinite(minDim)) return;

      const next = Math.max(0.35, Math.min(1, minDim / 320));
      setGiftOverlayScale(next);
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [compactMode, isFullscreen]);

  const handleGiftOpen = useCallback(async () => {
    const { checkCoinBalanceBeforeGift } = await import('@/lib/gift-balance-check');
    const hasCoins = await checkCoinBalanceBeforeGift();
    if (hasCoins) {
      setShowGiftModal(true);
    }
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (isFullscreen) {
      onExitFullscreen?.();
    } else {
      onExpand?.();
    }
  }, [isFullscreen, onExitFullscreen, onExpand]);

  const handleReplaceTile = useCallback(() => {
    if (!onReplace) return;
    onReplace();
  }, [onReplace]);

  const handleCloseTileAction = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleVolumeInput = useCallback((newVolume: number) => {
    onVolumeChange(newVolume);
    if (newVolume === 0 && !isMuted) {
      onMute();
    } else if (newVolume > 0 && isMuted) {
      onMute();
    }
  }, [isMuted, onMute, onVolumeChange]);

  // Like system
  const { isLiked, likesCount, toggleLike, isLoading: isLikeLoading } = useLiveLike({
    streamId: liveStreamId || null,
    profileId: user?.id,
    enabled: !!user && !!liveStreamId && isLive
  });

  // View tracking for trending (tracks unique views)
  useLiveViewTracking({
    streamId: liveStreamId || null,
    profileId: user?.id,
    enabled: !!liveStreamId && isLive && !isCurrentUser
  });

  // View tracking for trending
  useLiveViewTracking({
    streamId: liveStreamId || null,
    profileId: user?.id,
    enabled: !!liveStreamId && isLive && !isCurrentUser
  });

  // Daily leaderboard rank for this streamer
  const leaderboardRank = useDailyLeaderboardRank(streamerId, 'top_streamers');

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
    });
  }, [supabase]);

  // Reset like state when streamId changes (new stream = new like opportunity)
  useEffect(() => {
    if (!liveStreamId) return;
    
    // Reset fidget animation state for new stream
    setShowLikePop(false);
    setShowFloatingHeart(false);
    
    // Hook will auto-refetch stats for new stream_id
  }, [liveStreamId]);

  // Handle like tap: count once per stream, fidget after
  const handleLikeTap = useCallback(() => {
    if (!user || isLikeLoading) return;
    
    if (!isLiked) {
      // First like on this stream - call DB
      toggleLike();
      setShowLikePop(true);
      setTimeout(() => setShowLikePop(false), 500);
    } else {
      // Already liked this stream - fidget animation only (no DB call)
      setShowFloatingHeart(true);
      setTimeout(() => setShowFloatingHeart(false), 800);
    }
  }, [user, isLikeLoading, isLiked, toggleLike]);

  // PHASE 4: Pure render - simple track attach/detach
  useEffect(() => {
    // DIAGNOSTIC: Log track state on mobile PWA
    console.log('[TILE-VIDEO-PWA] Track state:', {
      slotIndex,
      streamerId,
      hasVideoTrack: !!videoTrack,
      hasVideoRef: !!videoRef.current,
      trackSid: (videoTrack as any)?.sid,
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
    });
    
    if (!videoTrack || !videoRef.current) return;
    videoTrack.attach(videoRef.current);
    
    // iOS-safe play with error handling
    videoRef.current.play().catch((err) => {
      console.warn('[TILE-VIDEO-PWA] Play failed:', err);
    });
    
    const detectAspectRatio = () => {
      const video = videoRef.current;
      if (video && video.videoWidth && video.videoHeight) {
        setVideoAspectRatio(video.videoWidth / video.videoHeight);
      }
    };
    detectAspectRatio();
    const video = videoRef.current;
    if (video) video.addEventListener('loadedmetadata', detectAspectRatio);
    
    return () => {
      if (video) video.removeEventListener('loadedmetadata', detectAspectRatio);
      if (videoTrack && videoRef.current) videoTrack.detach(videoRef.current);
    };
  }, [videoTrack]);

  useEffect(() => {
    if (!audioTrack || !audioRef.current || isCurrentUserPublishing) return;
    audioTrack.attach(audioRef.current);
    return () => {
      if (audioTrack && audioRef.current) audioTrack.detach(audioRef.current);
    };
  }, [audioTrack, isCurrentUserPublishing]);

  const isPortraitVideo = videoAspectRatio < 1;
  const isSquareVideo = videoAspectRatio >= 0.9 && videoAspectRatio <= 1.1;


  // Manage viewer heartbeat when tile is active and not muted
  // Heartbeat is analytics-only; do not gate publishing/subscribing
  const shouldSendHeartbeat = !!(
    liveStreamId !== undefined && 
    !isMuted
  );
  
  // CRITICAL: Track actual subscription state for heartbeat (not hardcoded true)
  // This ensures heartbeat accurately reflects whether we're subscribed to tracks
  const [isActuallySubscribed, setIsActuallySubscribed] = useState(false);
  
  useEffect(() => {
    // Update subscription state based on whether we have tracks
    setIsActuallySubscribed(!!(videoTrack || audioTrack));
  }, [videoTrack, audioTrack]);
  
  // CRITICAL: Only enable heartbeat if we have a valid liveStreamId
  // Passing 0 causes issues - heartbeat should only run for valid streams
  useViewerHeartbeat({
    liveStreamId: liveStreamId || 0, // Keep 0 fallback for type safety, but enabled check prevents actual use
    isActive: isActive && !isMuted,
    isUnmuted: !isMuted,
    isVisible: isVisible,
    isSubscribed: isActuallySubscribed, // Use actual subscription state, not hardcoded
    enabled: shouldSendHeartbeat && !!liveStreamId, // CRITICAL: Only enable if we have valid liveStreamId
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

  // Subscribe to stream status changes (detect when stream ends)
  useEffect(() => {
    if (!liveStreamId) return;

    const streamChannel = supabase
      .channel(`stream-status:${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${liveStreamId}`,
        },
        (payload: any) => {
          const newData = payload.new as any;
          
          // Stream ended - close tile and let LiveRoom replace with new streamer
          if (newData.live_available === false || newData.status === 'ended') {
            console.log('[Tile] Stream ended, closing tile:', { liveStreamId, streamerId, streamerUsername });
            
            // Just close this tile - LiveRoom will auto-replace with another active streamer
            onClose();
          }
        }
      )
      .subscribe();

    return () => {
      streamChannel.unsubscribe();
    };
  }, [liveStreamId, streamerId, streamerUsername, supabase, onClose]);

  // Subscribe to gift animations for this streamer (realtime)
  useEffect(() => {
    if (!streamerId || !liveStreamId) return;

    // Subscribe to gifts table for this recipient
    const giftsChannel = supabase
      .channel(`gifts:recipient:${streamerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
          filter: `recipient_id=eq.${streamerId}`,
        },
        async (payload: any) => {
          const gift = payload.new as any;
          
          // CRITICAL: Show animation for ALL viewers of this streamer (including the streamer themselves)
          // Remove slot_index filter so gift shows on every tile displaying this recipient
          // This ensures:
          // 1. Recipient sees it when viewing themselves
          // 2. All viewers of the recipient see it
          // 3. Animation is consistent across all viewers
          
          // Fetch sender username and gift type details
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', gift.sender_id)
            .single();
          
          const { data: giftType } = await supabase
            .from('gift_types')
            .select('name, icon_url, animation_url')
            .eq('id', gift.gift_type_id)
            .single();
          
          if (senderProfile && giftType) {
            const animationData: GiftAnimationData = {
              id: `${gift.id}-${Date.now()}`,
              giftName: giftType.name,
              giftIcon: giftType.icon_url,
              giftAnimationUrl: giftType.animation_url,
              senderUsername: senderProfile.username,
              coinAmount: gift.coin_amount,
            };
            
            setActiveGiftAnimations(prev => [...prev, animationData]);
          }
        }
      )
      .subscribe();

    return () => {
      giftsChannel.unsubscribe();
    };
  }, [streamerId, liveStreamId, slotIndex, streamerUsername, supabase]);

  // Apply volume to audio element when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Determine tile state from track presence (no preview mode)
  const tileState = videoTrack ? 'live' : 'offline';

  return (
    <div
      data-tile-id={slotIndex}
      onClick={() => {}}
      ref={tileContainerRef}
      className={`
        relative ${isFullscreen ? 'w-full h-full' : compactMode ? 'w-full h-full' : 'aspect-[3/2]'} rounded-lg overflow-hidden group
        border-2 transition-all duration-200
        ${
          tileState === 'live'
            ? 'border-red-500 shadow-lg shadow-red-500/20'
            : 'border-gray-300 dark:border-gray-700'
        }
      `}
    >
      {/* Video/Stream Area */}
      <div className="w-full h-full flex items-center justify-center bg-gray-900 relative overflow-hidden">
        {/* LiveKit Video Element - Show whenever we have a video track */}
        {videoTrack && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full ${
              !isFullscreen
                ? compactMode
                  ? 'object-contain'
                  : isPortraitVideo || isSquareVideo
                    ? 'object-contain'
                    : 'object-cover'
                : isPortraitVideo || isSquareVideo
                  ? 'object-contain'
                  : 'object-cover'
            }`}
            autoPlay
            playsInline
            muted={isMuted}
            controls={false}
            disablePictureInPicture
            webkit-playsinline="true"
          />
        )}

        {/* Fallback: Avatar or placeholder when no video track */}
        {!videoTrack && (
          <>
            {streamerAvatar ? (
              <img
                src={streamerAvatar}
                alt={streamerUsername}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-white text-2xl">👤</div>
              </div>
            )}
          </>
        )}

        {/* Audio element for LiveKit audio track - always render when we have a streamer */}
        <audio ref={audioRef} autoPlay playsInline className="hidden" />

        {/* No preview overlays - preview mode is invisible to users */}
        {/* No "Connecting..." UI - streamer should never see this */}

        {/* Gift Animations Overlay */}
        {activeGiftAnimations.map((gift) => (
          <GiftAnimation
            key={gift.id}
            giftName={gift.giftName}
            giftIcon={gift.giftIcon}
            giftAnimationUrl={gift.giftAnimationUrl}
            senderUsername={gift.senderUsername}
            coinAmount={gift.coinAmount}
            scale={giftOverlayScale}
            onComplete={() => {
              setActiveGiftAnimations((prev) => prev.filter((g) => g.id !== gift.id));
            }}
          />
        ))}
      </div>

      {/* LIVE badge removed - if video is visible, they're already live */}

      {/* Stats Overlay - Show viewer count, likes, and trending rank */}
      {!shouldUseCompact && (
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 z-20">
          {/* Left side: Trending rank OR likes */}
          <div className="flex items-center gap-2">
            {trendingRank && trendingRank <= 10 && (
              <div className={`px-2 py-1 rounded text-xs font-bold shadow-lg ${
                trendingRank === 1 ? 'bg-yellow-500 text-black' :
                trendingRank === 2 ? 'bg-gray-400 text-black' :
                trendingRank === 3 ? 'bg-orange-600 text-white' :
                'bg-red-500/90 text-white'
              }`}>
                🔥 #{trendingRank}
              </div>
            )}
            {likesCount > 0 && (
              <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
                ❤️ {likesCount}
              </div>
            )}
          </div>
          
          {/* Viewer count (right) */}
          {viewerCount > 0 && (
            <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs">
              👁️ {viewerCount}
            </div>
          )}
        </div>
      )}

      {/* Muted Indicator */}


      {/* Grid Controls: Volume (top-left) and Close (top-right) */}
      {!shouldUseCompact && !isFullscreen && (
        <>
          <div
            className="absolute top-2 left-2 z-20 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const newState = !showVolumeSlider;
                setShowVolumeSlider(newState);
                onVolumeSliderToggle?.(newState);
              }}
              className="p-1 text-white/90 hover:text-white transition"
              title="Volume"
            >
              {isMuted ? <VolumeX className={gridIconSizeClass} /> : <Volume2 className={gridIconSizeClass} />}
            </button>

            {showVolumeSlider && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  handleVolumeInput(parseFloat(e.target.value));
                }}
                onBlur={() => {
                  setShowVolumeSlider(false);
                  onVolumeSliderToggle?.(false);
                }}
                className="w-14 h-1 accent-white/90 opacity-90"
                title="Volume Slider"
              />
            )}
          </div>

          <div
            className="absolute top-2 right-2 z-20 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {onExpand && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand();
                }}
                className="p-1 text-white/90 hover:text-white transition"
                title="Expand"
              >
                <Maximize2 className={gridIconSizeClass} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 text-white/90 hover:text-white transition"
              title="Close"
            >
              <X className={gridIconSizeClass} />
            </button>
          </div>
        </>
      )}

      {/* Bottom Right Overlay - Username and Badge */}
      {!shouldUseCompact && isFullscreen && (
        <div className="absolute bottom-2 right-2 z-20">
          <div className="flex flex-col items-end gap-1">
            {/* Username and Badge - ALWAYS VISIBLE */}
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <UserNameWithBadges
                profileId={streamerId}
                name={streamerUsername}
                gifterStatus={gifterStatus}
                textSize="text-sm"
                nameClassName="text-white font-semibold hover:text-blue-200 transition"
                clickable
                onClick={() => setShowMiniProfile(true)}
              />
            </div>
            
            {/* Leaderboard Rank - ALWAYS VISIBLE - Prestigious Display */}
            {!leaderboardRank.isLoading && leaderboardRank.rank !== null && (
              <div 
                className={`backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-xl border-2 transition-all ${
                  leaderboardRank.rank === 1 
                    ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 border-yellow-300 shadow-yellow-500/50' 
                    : leaderboardRank.rank === 2
                    ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 border-gray-200 shadow-gray-400/50'
                    : leaderboardRank.rank === 3
                    ? 'bg-gradient-to-br from-orange-400 via-amber-600 to-orange-700 border-orange-300 shadow-orange-500/50'
                    : leaderboardRank.rank <= 10
                    ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 border-blue-400 shadow-blue-500/50'
                    : leaderboardRank.rank <= 50
                    ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 border-purple-400 shadow-purple-500/50'
                    : 'bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 border-green-400 shadow-green-500/50'
                }`}
              >
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5">
                    {leaderboardRank.rank === 1 && <span className="text-sm">👑</span>}
                    {leaderboardRank.rank === 2 && <span className="text-sm">🥈</span>}
                    {leaderboardRank.rank === 3 && <span className="text-sm">🥉</span>}
                    <span className="text-white text-xs font-bold tracking-tight drop-shadow-md">
                      #{leaderboardRank.rank}
                    </span>
                    <span className="text-white/90 text-[10px] font-semibold uppercase tracking-wider drop-shadow">
                      {leaderboardRank.tierName}
                    </span>
                  </div>
                  {leaderboardRank.pointsToNextRank !== null && (
                    <span className="text-white/95 text-[9px] font-medium tracking-tight drop-shadow">
                      {leaderboardRank.rank === 1 
                        ? '🏆 First Place' 
                        : `+${leaderboardRank.pointsToNextRank.toLocaleString()} 💎 to #${leaderboardRank.rank - 1}`
                      }
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Unranked but has some progress */}
            {!leaderboardRank.isLoading && leaderboardRank.rank === null && leaderboardRank.metricValue > 0 && (
              <div className="bg-gradient-to-br from-slate-600 via-slate-700 to-gray-800 backdrop-blur-md px-2.5 py-1.5 rounded-lg border-2 border-slate-500 shadow-xl shadow-slate-600/30">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-white text-xs font-bold tracking-tight drop-shadow-md">
                    Unranked
                  </span>
                  {leaderboardRank.pointsToNextRank !== null && (
                    <span className="text-slate-200 text-[9px] font-medium tracking-tight drop-shadow">
                      +{leaderboardRank.pointsToNextRank.toLocaleString()} 💎 to Top 100
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      {!shouldUseCompact && isFullscreen && (
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
                    e.stopPropagation();
                    handleVolumeInput(parseFloat(e.target.value));
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
      )}

      {/* Action Buttons */}
      {!shouldUseCompact && !isFullscreen && (
        <div className="absolute inset-x-0 bottom-0 z-20">
          <div
            className={`absolute inset-x-0 bottom-0 ${compactMode ? 'h-14' : 'h-12'} bg-gradient-to-t from-black/70 to-transparent`}
          />
          <div className="relative flex items-end justify-between px-2 pb-2">
            <div className="flex items-end gap-2 min-w-0 pointer-events-auto flex-1">
              {!isSelfTile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGiftOpen();
                  }}
                  className="text-white hover:opacity-90 transition flex-shrink-0"
                  title="Send Gift"
                >
                  <Gift className={gridIconSizeClass} />
                </button>
              )}
              <UserNameWithBadges
                profileId={streamerId}
                name={streamerUsername}
                gifterStatus={gifterStatus}
                textSize={compactMode ? 'text-[10px]' : 'text-xs'}
                nameClassName={`text-white font-semibold drop-shadow min-w-0 ${
                  compactMode
                    ? 'leading-tight whitespace-normal break-words overflow-hidden max-h-7'
                    : 'truncate flex-1'
                }`}
                clickable
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMiniProfile(true);
                }}
                showGifterBadge={false}
              />
            </div>

            <div className="flex items-center gap-2 pointer-events-auto flex-shrink-0">
              {user && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLikeTap();
                  }}
                  disabled={isLikeLoading}
                  className={`relative text-white transition-all ${showLikePop ? 'scale-125' : 'scale-100'} hover:opacity-90`}
                  title={isLiked ? 'Liked!' : 'Like'}
                >
                  <Heart className={gridIconSizeClass} fill={isLiked ? 'currentColor' : 'none'} />
                  {showLikePop && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-red-500 text-lg font-bold animate-fade-up pointer-events-none">
                      ❤️
                    </span>
                  )}
                  {showFloatingHeart && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-red-500 text-2xl animate-fade-up pointer-events-none">
                      ❤️
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen action buttons (vector-only) */}
      {!shouldUseCompact && isFullscreen && (
        <div className="absolute bottom-2 left-2 flex gap-2 opacity-100 transition-opacity z-20">
          {user && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLikeTap();
              }}
              disabled={isLikeLoading}
              className={`relative text-white transition-all ${showLikePop ? 'scale-125' : 'scale-100'} hover:opacity-90`}
              title={isLiked ? 'Liked!' : 'Like'}
            >
              <Heart className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          )}
          {!isSelfTile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleGiftOpen();
              }}
              className="text-white hover:opacity-90 transition"
              title="Send Gift"
            >
              <Gift className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Gift Modal */}
      {showGiftModal && (
        <GiftModal
          recipientId={streamerId}
          recipientUsername={streamerUsername}
          slotIndex={slotIndex}
          liveStreamId={liveStreamId}
          roomSlug={roomId}
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
          gifterStatus={gifterStatus}
          isLive={isLive}
          onClose={() => setShowMiniProfile(false)}
          onLeaveChannel={() => {
            // Close mini profile
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

