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
  isCurrentUserPublishing = false, // NEW: Whether current user is publishing
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
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [activeGiftAnimations, setActiveGiftAnimations] = useState<GiftAnimationData[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [showLikePop, setShowLikePop] = useState(false);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  const supabase = createClient();
  const shouldUseCompact = false;
  const isSelfTile = !!user && user.id === streamerId;
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

  // Track subscription state to prevent re-subscriptions
  const subscriptionRef = useRef<{ streamerId: string | null; subscribed: boolean }>({ streamerId: null, subscribed: false });
  // Track if we have tracks (for retry timer to check current state)
  const hasTracksRef = useRef<{ video: boolean; audio: boolean }>({ video: false, audio: false });
  const currentVideoSourceRef = useRef<Track.Source | null>(null);
  const currentAudioSourceRef = useRef<Track.Source | null>(null);

  // Use shared room connection instead of creating our own
  // Subscribe to tracks from the streamer when room is connected
  // CRITICAL: Only depend on streamerId and liveStreamId to prevent re-subscription loops
  // CRITICAL: Don't return early if live_available=true but is_published=false - wait for tracks
  const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
  
  // Helper to extract user ID from device-scoped identity
  // Identity format: u_<userId>:web:<deviceId>:<sessionId>
  // Detect video aspect ratio for orientation-aware display
  useEffect(() => {
    if (!videoTrack || !videoRef.current) return;

    const detectAspectRatio = () => {
      const video = videoRef.current;
      if (video && video.videoWidth && video.videoHeight) {
        const ratio = video.videoWidth / video.videoHeight;
        setVideoAspectRatio(ratio);
        console.log('[Tile] Video aspect ratio detected:', {
          slotIndex,
          streamerId,
          width: video.videoWidth,
          height: video.videoHeight,
          ratio,
          isPortrait: ratio < 1,
        });
      }
    };

    // Detect immediately if video is ready
    detectAspectRatio();

    // Also detect on loadedmetadata event
    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', detectAspectRatio);
      return () => {
        video.removeEventListener('loadedmetadata', detectAspectRatio);
      };
    }
  }, [videoTrack, slotIndex, streamerId]);

  const isPortraitVideo = videoAspectRatio < 1;
  const isSquareVideo = videoAspectRatio >= 0.9 && videoAspectRatio <= 1.1;

  const extractUserId = (identity: string): string => {
    if (identity.startsWith('u_')) {
      // Format: u_<userId>:web:device:session
      const parts = identity.split(':');
      if (parts.length >= 1) {
        return parts[0].substring(2); // Remove "u_" prefix
      }
    }
    return identity;
  };
  
  useEffect(() => {
    if (DEBUG_LIVEKIT) {
      console.log('[SUB] subscribe attempt', {
        slotIndex,
        streamerId,
        isCurrentUser,
        hasSharedRoom: !!sharedRoom,
        isRoomConnected,
        alreadySubscribed: subscriptionRef.current.subscribed && subscriptionRef.current.streamerId === streamerId,
      });
    }
    
    // NO PREVIEW MODE: Current user subscribes to their own remote tracks like everyone else
    // This allows streamers to see themselves broadcasting
    
    // Must have room, connection, and streamerId
    if (!sharedRoom || !isRoomConnected || !streamerId) {
      if (DEBUG_LIVEKIT) {
        console.log('[DEBUG] Tile subscription blocked (missing requirements):', {
          slotIndex,
          streamerId,
          hasSharedRoom: !!sharedRoom,
          isRoomConnected,
          hasStreamerId: !!streamerId,
        });
      }
      return;
    }
    
    // If streamer is live_available but not yet published, still try to subscribe (tracks may appear soon)
    // Heartbeat is already running, which will trigger publishing

    // Skip if already subscribed to this streamer (identity check only)
    if (subscriptionRef.current.subscribed && subscriptionRef.current.streamerId === streamerId) {
      if (DEBUG_LIVEKIT) {
        console.log('[DEBUG] Tile already subscribed, skipping:', { slotIndex, streamerId });
      }
      return;
    }

    // Mark as subscribed
    subscriptionRef.current.subscribed = true;
    subscriptionRef.current.streamerId = streamerId;
    
    if (DEBUG_LIVEKIT) {
      console.log('[DEBUG] Starting tile subscription:', { slotIndex, streamerId, liveStreamId });
    }

    const handleTrackSubscribed = (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
      // Only subscribe to tracks from this specific streamer
      // Compare using extracted user IDs since identities are device-scoped
      const participantUserId = extractUserId(participant.identity);
      if (participantUserId === streamerId) {
        const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
        const source = (publication as any)?.source as Track.Source | undefined;
        if (DEBUG_LIVEKIT) {
          console.log('[SUB] trackSubscribed', {
            slotIndex,
            participantIdentity: participant.identity,
            trackKind: track.kind,
            trackSid: track.sid,
            source,
          });
        }
        if (track.kind === Track.Kind.Video) {
          const isScreen = source === Track.Source.ScreenShare;
          const isCamera = source === Track.Source.Camera;

          if (isScreen) {
            hasTracksRef.current.video = true;
            currentVideoSourceRef.current = Track.Source.ScreenShare;
            setVideoTrack(track);
            if (videoRef.current) {
              track.attach(videoRef.current);
              if (DEBUG_LIVEKIT) {
                console.log('[DEBUG] Video track attached to DOM:', { slotIndex, streamerId, trackSid: track.sid });
              }
            }
            return;
          }

          if (isCamera) {
            if (currentVideoSourceRef.current === Track.Source.ScreenShare) return;
            if (!hasTracksRef.current.video || currentVideoSourceRef.current !== Track.Source.Camera) {
              hasTracksRef.current.video = true;
              currentVideoSourceRef.current = Track.Source.Camera;
              setVideoTrack(track);
              if (videoRef.current) {
                track.attach(videoRef.current);
                if (DEBUG_LIVEKIT) {
                  console.log('[DEBUG] Video track attached to DOM:', { slotIndex, streamerId, trackSid: track.sid });
                }
              }
            }
            return;
          }

          if (!hasTracksRef.current.video) {
            hasTracksRef.current.video = true;
            currentVideoSourceRef.current = source ?? null;
            setVideoTrack(track);
            if (videoRef.current) {
              track.attach(videoRef.current);
              if (DEBUG_LIVEKIT) {
                console.log('[DEBUG] Video track attached to DOM:', { slotIndex, streamerId, trackSid: track.sid });
              }
            }
          }
        } else if (track.kind === Track.Kind.Audio) {
          const selfUserId = user?.id || null;
          const localParticipantUserId = sharedRoom.localParticipant?.identity
            ? extractUserId(sharedRoom.localParticipant.identity)
            : null;
          const isSelfAudio =
            (!!selfUserId && participantUserId === selfUserId) ||
            (!!localParticipantUserId && participantUserId === localParticipantUserId);
          if (isSelfAudio) {
            if (DEBUG_LIVEKIT) {
              console.log('[SUB] Skipping self audio track', {
                slotIndex,
                streamerId,
                participantIdentity: participant.identity,
                source,
              });
            }
            try {
              track.detach();
            } catch {
              // ignore
            }
            return;
          }

          const isScreenAudio = source === Track.Source.ScreenShareAudio;
          const isMic = source === Track.Source.Microphone;

          if (isScreenAudio) {
            hasTracksRef.current.audio = true;
            currentAudioSourceRef.current = Track.Source.ScreenShareAudio;
            setAudioTrack(track);
            if (audioRef.current) {
              track.attach(audioRef.current);
              if (DEBUG_LIVEKIT) {
                console.log('[DEBUG] Audio track attached to DOM:', { slotIndex, streamerId, trackSid: track.sid });
              }
            }
            return;
          }

          if (isMic) {
            if (currentAudioSourceRef.current === Track.Source.ScreenShareAudio) return;
            if (!hasTracksRef.current.audio || currentAudioSourceRef.current !== Track.Source.Microphone) {
              hasTracksRef.current.audio = true;
              currentAudioSourceRef.current = Track.Source.Microphone;
              setAudioTrack(track);
              if (audioRef.current) {
                track.attach(audioRef.current);
                if (DEBUG_LIVEKIT) {
                  console.log('[DEBUG] Audio track attached to DOM:', { slotIndex, streamerId, trackSid: track.sid });
                }
              }
            }
            return;
          }

          if (!hasTracksRef.current.audio) {
            hasTracksRef.current.audio = true;
            currentAudioSourceRef.current = source ?? null;
            setAudioTrack(track);
            if (audioRef.current) {
              track.attach(audioRef.current);
              if (DEBUG_LIVEKIT) {
                console.log('[DEBUG] Audio track attached to DOM:', { slotIndex, streamerId, trackSid: track.sid });
              }
            }
          }
        }
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
      // CRITICAL: Only clear tracks if participant is ACTUALLY LEAVING the room
      // LiveKit fires unsubscription events for many reasons (adaptive streaming, network, etc.)
      // We must be very defensive and only clear when participant is gone
      const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
      if (DEBUG_LIVEKIT) {
        console.log('[SUB] Track unsubscribed', {
          slotIndex,
          participantIdentity: participant.identity,
          trackKind: track.kind,
          trackSid: track.sid,
          participantStillInRoom: sharedRoom.remoteParticipants.has(participant.identity),
        });
      }
      const participantUserId = extractUserId(participant.identity);
      if (participantUserId === streamerId) {
        // Check if participant is still in room
        const participantStillInRoom = sharedRoom.remoteParticipants.has(participant.identity);
        
        if (DEBUG_LIVEKIT) {
          console.log('[DEBUG] Tile track unsubscribed:', {
            slotIndex,
            streamerId,
            trackKind: track.kind,
            trackSid: track.sid,
            participantStillInRoom,
            trackPublicationsCount: participant.trackPublications.size,
            publicationIsMuted: publication.isMuted,
            publicationIsSubscribed: publication.isSubscribed,
          });
        }
        
        // ONLY clear tracks if participant has LEFT the room entirely
        // Do NOT clear on temporary unsubscriptions, adaptive streaming changes, or mute events
        // LiveKit will automatically resubscribe when tracks are available again
        if (!participantStillInRoom) {
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Participant left room, clearing tracks:', { slotIndex, streamerId });
          }
          if (track.kind === Track.Kind.Video) {
            track.detach();
            hasTracksRef.current.video = false;
            setVideoTrack(null);
          } else if (track.kind === Track.Kind.Audio) {
            track.detach();
            hasTracksRef.current.audio = false;
            setAudioTrack(null);
          }
        } else {
          // Participant still in room - this is a temporary unsubscription
          // Do NOT clear tracks - LiveKit will resubscribe automatically
          // Clearing here causes the flicker/black screen issue
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Ignoring temporary unsubscription (participant still in room):', {
              slotIndex,
              streamerId,
              trackKind: track.kind,
            });
          }
        }
      }
    };

    // Subscribe to existing tracks
    const checkForTracks = () => {
      let foundParticipant = false;
      let trackCount = 0;
      let isLocalParticipant = false;
      
      // CRITICAL: Check if this is the current user's own tile
      // Identity format: u_<userId>:web:<deviceId>:<sessionId>
      // streamerId is just the userId, so extract it from identity
      
      // If so, use local participant's published tracks instead of remote
      if (sharedRoom.localParticipant && extractUserId(sharedRoom.localParticipant.identity) === streamerId) {
        const localParticipant = sharedRoom.localParticipant;
        const hasPreferredLocalTrack = Array.from(localParticipant.trackPublications.values()).some((publication) => {
          const isPreferred =
            publication.source === Track.Source.ScreenShare ||
            publication.source === Track.Source.ScreenShareAudio ||
            publication.source === Track.Source.Camera ||
            publication.source === Track.Source.Microphone;
          return isPreferred && !!publication.track;
        });

        // Only treat localParticipant as the streamer if it actually has usable tracks.
        if (hasPreferredLocalTrack) {
          foundParticipant = true;
          isLocalParticipant = true;
          trackCount = localParticipant.trackPublications.size;
        }
        
        if (DEBUG_LIVEKIT) {
          console.log('[SUB] Found LOCAL participant (self) for tile:', {
            slotIndex,
            streamerId,
            participantIdentity: localParticipant.identity,
            trackPublicationsCount: localParticipant.trackPublications.size,
            publications: Array.from(localParticipant.trackPublications.values()).map((p) => ({
              kind: p.track?.kind,
              source: p.source,
              sid: p.trackSid,
              hasTrack: !!p.track,
            })),
            hasPreferredLocalTrack,
          });
        }

        // Attach local tracks - VIDEO ONLY (never attach local audio to prevent echo)
        localParticipant.trackPublications.forEach((publication) => {
          const isPreferred =
            publication.source === Track.Source.ScreenShare ||
            publication.source === Track.Source.ScreenShareAudio ||
            publication.source === Track.Source.Camera ||
            publication.source === Track.Source.Microphone;

          if (isPreferred && publication.track) {
            const track = publication.track;

            if (track.kind === Track.Kind.Audio) {
              return;
            }

            if (DEBUG_LIVEKIT) {
              console.log('[SUB] Attaching LOCAL track to tile:', {
                slotIndex,
                kind: track.kind,
                source: publication.source,
              });
            }

            // Attach local video track to this tile
            handleTrackSubscribed(track as any, publication as any, localParticipant as any);
          }
        });
        
        // Don't return yet - we still need to set up listeners below
        // return; // Done processing local participant
      }
      
      // If we already handled local participant, skip remote participant check
      if (isLocalParticipant) {
        return foundParticipant;
      }
      
      // Not the current user - check remote participants
      sharedRoom.remoteParticipants.forEach((participant) => {
        const participantUserId = extractUserId(participant.identity);
        if (participantUserId === streamerId) {
          foundParticipant = true;
          trackCount = participant.trackPublications.size;
          
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Found remote participant for tile:', {
              slotIndex,
              streamerId,
              participantIdentity: participant.identity,
              trackPublicationsCount: participant.trackPublications.size,
              publications: Array.from(participant.trackPublications.values()).map(p => ({
                kind: p.track?.kind,
                source: p.source,
                sid: p.trackSid,
                isSubscribed: p.isSubscribed,
                hasTrack: !!p.track,
              })),
            });
          }
          
          // CRITICAL: Explicitly subscribe to ALL camera/microphone publications
          // In LiveKit, publications exist but must be explicitly subscribed to
          participant.trackPublications.forEach((publication) => {
            const isPreferred =
              publication.source === Track.Source.ScreenShare ||
              publication.source === Track.Source.ScreenShareAudio ||
              publication.source === Track.Source.Camera ||
              publication.source === Track.Source.Microphone;
            
            if (isPreferred) {
              // CRITICAL: Only subscribe if publication has a trackSid (track is actually ready)
              // Subscribing to publications without tracks causes rapid subscribe/unsubscribe cycles
              if (!publication.trackSid) {
                if (DEBUG_LIVEKIT) {
                  console.log('[DEBUG] Skipping subscription (no trackSid yet):', {
                    slotIndex,
                    streamerId,
                    source: publication.source,
                  });
                }
                return;
              }
              
              // If not already subscribed, subscribe now
              if (!publication.isSubscribed) {
                if (DEBUG_LIVEKIT) {
                  console.log('[DEBUG] Subscribing to publication:', {
                    slotIndex,
                    streamerId,
                    source: publication.source,
                    sid: publication.trackSid,
                  });
                }
                try {
                  publication.setSubscribed(true);
                } catch (err) {
                  if (DEBUG_LIVEKIT) {
                    console.warn('[DEBUG] Failed to subscribe to publication:', err);
                  }
                }
              }
              
              // If track is already available, handle it immediately
              if (publication.track) {
                handleTrackSubscribed(publication.track as RemoteTrack, publication, participant);
              }
            }
          });
        }
      });
      
      if (!foundParticipant) {
        const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
        if (DEBUG_LIVEKIT) {
          console.log('[SUB] subscribe attempt', {
            slotIndex,
            participantIdentityFound: false,
            streamerId,
            liveStreamId,
            remoteParticipantsCount: sharedRoom.remoteParticipants.size,
            remoteParticipantIdentities: Array.from(sharedRoom.remoteParticipants.values()).map(p => p.identity),
          });
        }
      } else {
        // Log when participant IS found (even if no tracks yet)
        if (DEBUG_LIVEKIT) {
          const targetParticipant = Array.from(sharedRoom.remoteParticipants.values()).find((p) => extractUserId(p.identity) === streamerId) || null;
          console.log('[SUB] subscribe attempt', {
            slotIndex,
            participantIdentityFound: true,
            streamerId,
            trackCount,
            publicationsSubscribed: Array.from(targetParticipant?.trackPublications.values() || []).filter(p => p.isSubscribed).length,
          });
        }
      }
    };
    
    // Check immediately
    checkForTracks();
    
    // If tracks not found yet, retry briefly to catch late publications
    let retryAttempts = 0;
    const maxRetryAttempts = 20; // Increased to handle slower publishing
    const retryInterval = 500; // 500ms between retries = ~10 seconds total
    
    const retryTimer = setInterval(() => {
      // Stop retrying if conditions changed
      if (!sharedRoom || !isRoomConnected || !streamerId) {
        clearInterval(retryTimer);
        return;
      }
      
      // Stop if we already have BOTH video AND audio tracks
      // Keep checking if we only have one (waiting for the other)
      if (hasTracksRef.current.video && hasTracksRef.current.audio) {
        clearInterval(retryTimer);
        return;
      }
      
      retryAttempts++;
      if (retryAttempts >= maxRetryAttempts) {
        if (DEBUG_LIVEKIT) {
          console.log('[DEBUG] Retry timer stopped (max attempts reached):', {
            slotIndex,
            streamerId,
            hasVideo: hasTracksRef.current.video,
            hasAudio: hasTracksRef.current.audio,
          });
        }
        clearInterval(retryTimer);
        return;
      }
      
      // Check for tracks again (will subscribe to any new publications)
      checkForTracks();
    }, retryInterval);

    // Listen for new tracks being subscribed
    sharedRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    sharedRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    
    // CRITICAL: Also listen for LOCAL participant track publications (when current user goes live)
    // This ensures we see our own video when we publish
    const handleLocalTrackPublished = () => {
      if (sharedRoom.localParticipant && extractUserId(sharedRoom.localParticipant.identity) === streamerId) {
        if (DEBUG_LIVEKIT) {
          console.log('[SUB] Local track published, re-checking for self-view:', {
            slotIndex,
            streamerId,
            trackPublicationsCount: sharedRoom.localParticipant.trackPublications.size,
          });
        }
        // Re-check tracks to attach newly published local tracks
        checkForTracks();
      }
    };
    sharedRoom.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    
    // CRITICAL: Also listen for when participants connect and when they publish tracks
    // This ensures we subscribe to tracks even if they're published after the Tile mounts
    const handleParticipantConnected = (participant: RemoteParticipant) => {
      if (extractUserId(participant.identity) === streamerId) {
        if (DEBUG_LIVEKIT) {
          console.log('[DEBUG] Target participant connected, checking for publications:', {
            slotIndex,
            streamerId,
            trackPublicationsCount: participant.trackPublications.size,
          });
        }
        // Immediately check and subscribe to any existing publications
        checkForTracks();
        
        // Also listen for when this participant publishes new tracks
        // Note: LiveKit may not have a direct 'trackPublished' event, so we'll use a polling approach
        // Check publications periodically to catch new ones
        let lastPublicationCount = participant.trackPublications.size;
        const checkPublicationsInterval = setInterval(() => {
          const currentCount = participant.trackPublications.size;
          if (currentCount > lastPublicationCount) {
            // New publications detected - subscribe to them
            if (DEBUG_LIVEKIT) {
              console.log('[DEBUG] New publications detected, re-checking:', {
                slotIndex,
                streamerId,
                oldCount: lastPublicationCount,
                newCount: currentCount,
              });
            }
            checkForTracks();
            lastPublicationCount = currentCount;
          }
        }, 1000); // Check every second for new publications
        
        // Store cleanup function
        return () => {
          clearInterval(checkPublicationsInterval);
        };
      }
      return null;
    };
    
    // Track cleanup functions for participant listeners
    const participantCleanups: Array<() => void> = [];
    
    // Check if participant is already connected
    sharedRoom.remoteParticipants.forEach((participant) => {
      const cleanup = handleParticipantConnected(participant);
      if (cleanup) {
        participantCleanups.push(cleanup);
      }
    });
    
    // Listen for new participants connecting
    const roomParticipantConnectedHandler = (participant: RemoteParticipant) => {
      const cleanup = handleParticipantConnected(participant);
      if (cleanup) {
        participantCleanups.push(cleanup);
      }
    };
    sharedRoom.on(RoomEvent.ParticipantConnected, roomParticipantConnectedHandler);

    return () => {
      clearInterval(retryTimer);
      sharedRoom.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      sharedRoom.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      sharedRoom.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
      sharedRoom.off(RoomEvent.ParticipantConnected, roomParticipantConnectedHandler);
      // Clean up participant-level listeners
      participantCleanups.forEach(cleanup => cleanup());
      participantCleanups.length = 0;
      // Only mark as unsubscribed if this is the same streamer
      if (subscriptionRef.current.streamerId === streamerId) {
        subscriptionRef.current.subscribed = false;
        subscriptionRef.current.streamerId = null;
      }
    };
    // CRITICAL: Depend ONLY on primitive values to prevent reruns on object reference changes
    // Use roomState/roomName instead of sharedRoom object to detect when room actually changes
    // The subscriptionRef guard prevents re-subscription when streamerId hasn't changed
    // CRITICAL: Subscription must work even if streamer is live_available but not yet is_published
    // CRITICAL: Include isCurrentUser in deps so we skip subscription when it's the current user
  }, [isRoomConnected, streamerId, isCurrentUser, sharedRoom]);

  // Check if this is the current user's tile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      setIsCurrentUser(user?.id === streamerId);
    });
  }, [streamerId, supabase]);

  // NO PREVIEW MODE: Current user sees their own tracks through the room

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
        if (DEBUG_LIVEKIT) {
          const el = videoRef.current;
          const mst: any = (videoTrack as any)?.mediaStreamTrack;
          console.log('[VIDEO-AUDIT] attach', {
            slotIndex,
            streamerId,
            trackSid: (videoTrack as any)?.sid,
            element: {
              paused: el?.paused,
              readyState: el?.readyState,
              videoWidth: el?.videoWidth,
              videoHeight: el?.videoHeight,
              currentTime: el?.currentTime,
            },
            mediaStreamTrack: mst
              ? {
                  readyState: mst.readyState,
                  enabled: mst.enabled,
                  muted: mst.muted,
                  settings: typeof mst.getSettings === 'function' ? mst.getSettings() : null,
                }
              : null,
          });
        }

        const el = videoRef.current;
        if (el) {
          const onLoadedMetadata = () => {
            if (DEBUG_LIVEKIT) {
              console.log('[VIDEO-AUDIT] loadedmetadata', {
                slotIndex,
                streamerId,
                readyState: el.readyState,
                paused: el.paused,
                videoWidth: el.videoWidth,
                videoHeight: el.videoHeight,
              });
            }
          };
          const onPlaying = () => {
            if (DEBUG_LIVEKIT) {
              console.log('[VIDEO-AUDIT] playing', {
                slotIndex,
                streamerId,
                readyState: el.readyState,
                paused: el.paused,
                videoWidth: el.videoWidth,
                videoHeight: el.videoHeight,
              });
            }
          };
          const onError = () => {
            if (DEBUG_LIVEKIT) {
              console.log('[VIDEO-AUDIT] error', {
                slotIndex,
                streamerId,
                error: (el as any)?.error,
              });
            }
          };
          el.addEventListener('loadedmetadata', onLoadedMetadata);
          el.addEventListener('playing', onPlaying);
          el.addEventListener('error', onError);

          el.play().catch((err) => {
            if (DEBUG_LIVEKIT) {
              console.log('[VIDEO-AUDIT] play() rejected', { slotIndex, streamerId, err: String(err) });
            }
          });

          setTimeout(() => {
            if (DEBUG_LIVEKIT) {
              console.log('[VIDEO-AUDIT] post-attach snapshot', {
                slotIndex,
                streamerId,
                readyState: el.readyState,
                paused: el.paused,
                videoWidth: el.videoWidth,
                videoHeight: el.videoHeight,
                currentTime: el.currentTime,
              });
            }
          }, 750);

          return () => {
            el.removeEventListener('loadedmetadata', onLoadedMetadata);
            el.removeEventListener('playing', onPlaying);
            el.removeEventListener('error', onError);
          };
        }

        attachedVideoTrackRef.current = videoTrack;
        hasTracksRef.current.video = true; // Sync ref for retry timer
      }
    } else if (!videoTrack && attachedVideoTrackRef.current && videoRef.current) {
      // Clean up if track is removed
      attachedVideoTrackRef.current.detach();
      attachedVideoTrackRef.current = null;
      hasTracksRef.current.video = false; // Sync ref for retry timer
    }
    
    return () => {
      if (attachedVideoTrackRef.current && videoRef.current) {
        attachedVideoTrackRef.current.detach();
        attachedVideoTrackRef.current = null;
      }
    };
  }, [videoTrack]);

  // Attach audio track and apply volume/mute - use ref to prevent re-attachment
  // CRITICAL: Prevent echo - mute own audio playback when publishing to avoid feedback loop
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
      
      const shouldMuteForEcho = isCurrentUser;
      
      if (DEBUG_LIVEKIT && isCurrentUser) {
        console.log('[DEBUG] Echo prevention check:', {
          slotIndex,
          isCurrentUser,
          isCurrentUserPublishing,
          shouldMuteForEcho,
          isMuted,
        });
      }
      
      // Apply mute: either user muted OR echo prevention (ONLY for current user's own tile)
      // Other tiles are never affected by echo prevention
      const finalMute = isMuted || shouldMuteForEcho;
      audioRef.current.volume = finalMute ? 0 : volume;
      
      if (DEBUG_LIVEKIT) {
        console.log('[AUDIO] Volume applied', {
          slotIndex,
          streamerId,
          isCurrentUser,
          isMuted,
          shouldMuteForEcho,
          finalMute,
          volume,
          finalVolume: audioRef.current.volume,
        });
      }
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
  }, [audioTrack, isMuted, volume, isCurrentUser, isCurrentUserPublishing]);

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
            .select('name, icon_url')
            .eq('id', gift.gift_type_id)
            .single();
          
          if (senderProfile && giftType) {
            const animationData: GiftAnimationData = {
              id: `${gift.id}-${Date.now()}`,
              giftName: giftType.name,
              giftIcon: giftType.icon_url,
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

