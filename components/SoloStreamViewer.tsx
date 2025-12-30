'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { 
  Share2, 
  MessageCircle, 
  Gift as GiftIcon, 
  Flag,
  UserPlus,
  UserMinus,
  ChevronRight,
  ChevronLeft,
  Eye,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import Image from 'next/image';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, TrackPublication } from 'livekit-client';
import { LIVEKIT_ROOM_NAME, DEBUG_LIVEKIT, TOKEN_ENDPOINT } from '@/lib/livekit-constants';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import Chat from './Chat';
import GiftModal from './GiftModal';
import ReportModal from './ReportModal';
import GoLiveButton from './GoLiveButton';
import { useIM } from '@/components/im';

interface SoloStreamViewerProps {
  username: string;
}

interface StreamerData {
  id: string;
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  live_available: boolean;
  viewer_count: number;
  gifter_level: number;
  gifter_status?: GifterStatus | null;
  stream_title?: string;
  live_stream_id?: number;
}

interface RecommendedStream {
  id: string;
  username: string;
  avatar_url?: string;
  viewer_count: number;
  is_live: boolean;
}

export default function SoloStreamViewer({ username }: SoloStreamViewerProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  const { openChat: openIM } = useIM();
  
  const [streamer, setStreamer] = useState<StreamerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [recommendedStreams, setRecommendedStreams] = useState<RecommendedStream[]>([]);
  
  // LiveKit room connection - SINGLE connection per mount
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isConnectingRef = useRef(false); // Guard against duplicate connects
  const connectedUsernameRef = useRef<string | null>(null); // Track who we're connected to
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);

  // Get current user
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    initUser();
  }, [supabase]);

  // Load streamer data
  useEffect(() => {
    const loadStreamer = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch streamer profile and live status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            display_name,
            avatar_url,
            bio,
            gifter_level
          `)
          .ilike('username', username)
          .single();

        if (profileError || !profile) {
          setError('Streamer not found');
          setLoading(false);
          return;
        }

        // Fetch live stream data
        const { data: liveStream } = await supabase
          .from('live_streams')
          .select('id, live_available, stream_title')
          .eq('profile_id', profile.id)
          .single();

        // Fetch gifter status
        const gifterStatuses = await fetchGifterStatuses([profile.id]);
        const gifterStatus = gifterStatuses[profile.id] || null;

        const streamerData: StreamerData = {
          id: liveStream?.id?.toString() || '0',
          profile_id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          live_available: liveStream?.live_available || false,
          viewer_count: 0, // Will be updated via realtime
          gifter_level: profile.gifter_level || 0,
          gifter_status: gifterStatus,
          stream_title: liveStream?.stream_title,
          live_stream_id: liveStream?.id,
        };

        console.log('[SoloStreamViewer] 🔍 Streamer data loaded:', {
          username: streamerData.username,
          live_stream_id: streamerData.live_stream_id,
          live_available: streamerData.live_available,
        });

        setStreamer(streamerData);
        setLoading(false);

        // Check follow status if user is logged in
        if (currentUserId && currentUserId !== profile.id) {
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('following_id', profile.id)
            .single();
          
          setIsFollowing(!!followData);
        }

      } catch (err) {
        console.error('[SoloStreamViewer] Error loading streamer:', err);
        setError('Failed to load stream');
        setLoading(false);
      }
    };

    loadStreamer();
  }, [username, currentUserId, supabase]);

  // Connect to LiveKit room - SINGLE CONNECTION GUARD
  // CRITICAL: Minimal stable deps to prevent reconnection loops
  useEffect(() => {
    if (!streamer?.live_available || !streamer.profile_id || !streamer.username) return;

    // Guard: Only one connect per mount, and only if username changed
    if (isConnectingRef.current || connectedUsernameRef.current === streamer.username) {
      if (DEBUG_LIVEKIT) {
        console.log('[SoloStreamViewer] Skipping connect - already connecting or connected to:', streamer.username);
      }
      return;
    }

    isConnectingRef.current = true;
    connectedUsernameRef.current = streamer.username;

    const connectToRoom = async () => {
      try {
        if (DEBUG_LIVEKIT) {
          console.log('[SoloStreamViewer] Connecting to room for:', streamer.username);
        }

        // Disconnect existing room if switching streamers
        if (roomRef.current) {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Disconnecting previous room before connecting to new streamer');
          }
          roomRef.current.disconnect();
          roomRef.current = null;
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        // Detect if current user is the streamer (host mode)
        const isHost = currentUserId && streamer.profile_id && currentUserId === streamer.profile_id;
        
        if (DEBUG_LIVEKIT) {
          console.log('[SoloStreamViewer] Connection mode:', {
            isHost,
            currentUserId,
            streamerProfileId: streamer.profile_id,
            canPublish: isHost,
            role: isHost ? 'host' : 'viewer'
          });
        }
        
        // Get LiveKit token - use host identity if owner, viewer otherwise
        const viewerIdentity = currentUserId || `anon_${Date.now()}`;
        const participantName = isHost ? `host_${viewerIdentity}` : `viewer_${viewerIdentity}`;
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName: LIVEKIT_ROOM_NAME,
            participantName: participantName,
            canPublish: isHost,  // TRUE for host, FALSE for viewers
            canSubscribe: true,
            deviceType: 'web',
            deviceId: `solo_${isHost ? 'host' : 'viewer'}_${Date.now()}`,
            sessionId: `solo_${Date.now()}`,
            role: isHost ? 'host' : 'viewer',
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to get token: ${tokenResponse.status}`);
        }

        const { token, url } = await tokenResponse.json();

        if (!token || !url) {
          throw new Error('Invalid token response');
        }

        await room.connect(url, token);
        setIsRoomConnected(true);

        if (DEBUG_LIVEKIT) {
          console.log('[SoloStreamViewer] Connected to room, participants:', room.remoteParticipants.size);
        }

        // Handle track subscriptions - subscribe to streamer's tracks
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Track subscribed:', {
              kind: track.kind,
              participant: participant.identity,
              source: (publication as any)?.source,
            });
          }

          // Only attach video tracks (audio is handled separately)
          if (track.kind === Track.Kind.Video && videoRef.current) {
            track.attach(videoRef.current);
            
            // Detect aspect ratio
            const video = videoRef.current;
            const detectAspectRatio = () => {
              if (video.videoWidth && video.videoHeight) {
                const ratio = video.videoWidth / video.videoHeight;
                setVideoAspectRatio(ratio);
                if (DEBUG_LIVEKIT) {
                  console.log('[SoloStreamViewer] Video aspect ratio:', ratio);
                }
              }
            };
            
            video.addEventListener('loadedmetadata', detectAspectRatio);
            detectAspectRatio();
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Disconnected from room');
          }
          setIsRoomConnected(false);
          isConnectingRef.current = false;
        });

        room.on(RoomEvent.Reconnecting, () => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Reconnecting to room...');
          }
        });

        room.on(RoomEvent.Reconnected, () => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Reconnected to room');
          }
          setIsRoomConnected(true);
        });

        isConnectingRef.current = false;

      } catch (err) {
        console.error('[SoloStreamViewer] Error connecting to room:', err);
        isConnectingRef.current = false;
        connectedUsernameRef.current = null;
      }
    };

    connectToRoom();

    // Cleanup: disconnect on unmount or username change
    return () => {
      if (DEBUG_LIVEKIT) {
        console.log('[SoloStreamViewer] Cleanup: disconnecting room');
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      isConnectingRef.current = false;
      connectedUsernameRef.current = null;
      setIsRoomConnected(false);
    };
  }, [streamer?.live_available, streamer?.profile_id, streamer?.username]); // STABLE DEPS: only reconnect if these change

  // Load recommended streams
  useEffect(() => {
    const loadRecommended = async () => {
      if (!streamer?.profile_id) return;

      const { data: liveStreams } = await supabase
        .from('live_streams')
        .select(`
          id,
          profile_id,
          profiles!inner(username, avatar_url)
        `)
        .eq('live_available', true)
        .neq('profile_id', streamer.profile_id)
        .limit(10);

      if (liveStreams) {
        const recommended: RecommendedStream[] = liveStreams.map((stream: any) => ({
          id: stream.profile_id,
          username: stream.profiles.username,
          avatar_url: stream.profiles.avatar_url,
          viewer_count: 0,
          is_live: true,
        }));
        setRecommendedStreams(recommended);
      }
    };

    loadRecommended();
  }, [streamer?.profile_id, supabase]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!currentUserId || !streamer) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', streamer.profile_id);
        setIsFollowing(false);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: streamer.profile_id,
          });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('[SoloStreamViewer] Error toggling follow:', err);
    }
  };

  // Handle share
  const handleShare = () => {
    if (navigator.share && streamer) {
      navigator.share({
        title: `${streamer.display_name || streamer.username}'s Live Stream`,
        text: `Watch ${streamer.display_name || streamer.username} live on MyLiveLinks!`,
        url: window.location.href,
      }).catch(() => {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
      });
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error || !streamer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Stream not found'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This streamer does not exist or their profile is not available.
          </p>
          <button
            onClick={() => router.push('/live')}
            className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Browse Live Streams
          </button>
        </div>
      </div>
    );
  }

  const isPortraitVideo = videoAspectRatio < 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 md:bg-gray-50 md:dark:bg-gray-900">
      {/* Top Navigation Bar - Desktop: full bar, Mobile: transparent overlay */}
      <div className="
        bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 
        px-4 py-3 flex items-center justify-between
        md:bg-white md:dark:bg-gray-800 md:border-b md:relative
        
        /* Mobile: transparent overlay at top */
        fixed md:relative top-0 left-0 right-0 z-30
        bg-transparent md:bg-white md:dark:bg-gray-800
        border-b-0 md:border-b
      ">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/live')}
            className="
              text-white md:text-gray-600 md:dark:text-gray-400 
              hover:text-white/80 md:hover:text-gray-900 md:dark:hover:text-white 
              transition-colors
              bg-black/30 md:bg-transparent
              p-2 md:p-0
              rounded-full
              backdrop-blur-sm md:backdrop-blur-none
            "
            title="Back to Browse"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          {/* Streamer Info - Desktop only */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <Image
                src={getAvatarUrl(streamer.avatar_url)}
                alt={streamer.username}
                width={40}
                height={40}
                className="rounded-full"
              />
              {streamer.live_available && (
                <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                  LIVE
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 dark:text-white">
                  {streamer.display_name || streamer.username}
                </h2>
                {streamer.gifter_status && (
                  <TierBadge 
                    tier_key={streamer.gifter_status.tier_key}
                    level={streamer.gifter_status.level_in_tier}
                    size="sm"
                  />
                )}
              </div>
              {streamer.stream_title && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {streamer.stream_title}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - Desktop only */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Eye className="w-4 h-4" />
            <span>{streamer.viewer_count.toLocaleString()}</span>
          </div>
          
          {/* Show Go Live button if owner is viewing their own page */}
          {currentUserId && currentUserId === streamer.profile_id && (
            <GoLiveButton 
              sharedRoom={roomRef.current}
              isRoomConnected={isRoomConnected}
            />
          )}
          
          {currentUserId && currentUserId !== streamer.profile_id && (
            <button
              onClick={handleFollow}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isFollowing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Follow
                </>
              )}
            </button>
          )}
          
          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Report"
          >
            <Flag className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area - Desktop: normal layout, Mobile: full screen */}
      <div className="
        flex relative
        h-[calc(100vh-73px)] md:h-[calc(100vh-73px)]
        h-screen md:h-[calc(100vh-73px)]
        pt-0 md:pt-0
      ">
        {/* Left/Center: Video Player */}
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 flex items-center justify-center relative">
            {/* Mobile: Streamer info overlay at top */}
            <div className="
              md:hidden absolute top-4 left-4 right-4 z-20
              flex items-center justify-between
            ">
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full px-3 py-2">
                <Image
                  src={getAvatarUrl(streamer.avatar_url)}
                  alt={streamer.username}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {streamer.display_name || streamer.username}
                    </span>
                    {streamer.live_available && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-bold">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <Eye className="w-3 h-3" />
                    <span>{streamer.viewer_count.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Mobile action buttons */}
              <div className="flex items-center gap-2">
                {currentUserId && currentUserId !== streamer.profile_id && (
                  <button
                    onClick={handleFollow}
                    className={`
                      p-2 rounded-full backdrop-blur-md transition-colors
                      ${isFollowing 
                        ? 'bg-white/20 text-white' 
                        : 'bg-purple-500 text-white'
                      }
                    `}
                  >
                    {isFollowing ? (
                      <UserMinus className="w-5 h-5" />
                    ) : (
                      <UserPlus className="w-5 h-5" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                  title="Report"
                >
                  <Flag className="w-5 h-5" />
                </button>
              </div>
            </div>

            {streamer.live_available ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className={`max-w-full max-h-full ${
                  isPortraitVideo ? 'h-full w-auto' : 'w-full h-auto'
                }`}
              />
            ) : (
              <div className="text-center text-white">
                <div className="mb-4">
                  <Image
                    src={getAvatarUrl(streamer.avatar_url)}
                    alt={streamer.username}
                    width={120}
                    height={120}
                    className="rounded-full mx-auto"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {streamer.display_name || streamer.username} is offline
                </h3>
                <p className="text-gray-400 mb-4">
                  Follow to get notified when they go live!
                </p>
              </div>
            )}

            {/* Volume Control Overlay - Hidden on mobile (tap to unmute instead) */}
            {streamer.live_available && (
              <div className="hidden md:flex absolute bottom-4 left-4 items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                <button
                  onClick={handleMuteToggle}
                  className="text-white hover:text-purple-400 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 accent-purple-500"
                />
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGiftModal(true)}
                disabled={!streamer.live_available}
                className={`px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2 font-medium ${
                  !streamer.live_available ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <GiftIcon className="w-5 h-5" />
                Send Gift
              </button>
              
              <button
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="React"
                disabled
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {currentUserId && currentUserId !== streamer.profile_id && (
                <button
                  onClick={() => openIM(streamer.profile_id, streamer.username)}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Message
                </button>
              )}
              
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Recommended Streams Carousel - Desktop only */}
          {recommendedStreams.length > 0 && (
            <div className="hidden md:block bg-gray-900 border-t border-gray-800 px-4 py-4">
              <h3 className="text-white font-semibold mb-3">Recommended Live Streams</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                {recommendedStreams.map((stream) => (
                  <button
                    key={stream.id}
                    onClick={() => router.push(`/live/${stream.username}`)}
                    className="flex-shrink-0 group"
                  >
                    <div className="relative">
                      <Image
                        src={getAvatarUrl(stream.avatar_url)}
                        alt={stream.username}
                        width={80}
                        height={80}
                        className="rounded-lg group-hover:opacity-80 transition-opacity"
                      />
                      <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                        LIVE
                      </div>
                    </div>
                    <p className="text-sm text-white mt-1 text-center truncate w-20">
                      {stream.username}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Chat Panel - Desktop: sidebar, Mobile: full-width overlay at bottom */}
        <div className={`
          transition-all duration-300
          
          /* Mobile: Fixed full-width overlay at bottom */
          ${isChatOpen ? 'fixed' : 'hidden'}
          md:block
          bottom-0 left-0 right-0 w-full
          h-[33vh]
          bg-black/20 dark:bg-black/20
          backdrop-blur-md
          border-t border-white/10 dark:border-white/10
          z-20
          
          /* Desktop: Sidebar on right */
          md:relative
          md:bottom-auto md:left-auto md:right-0
          md:h-full
          ${isChatOpen ? 'md:w-96' : 'md:w-0'}
          md:bg-white md:dark:bg-gray-800
          md:backdrop-blur-none
          md:border-t-0 md:border-l md:border-gray-200 md:dark:border-gray-700
          overflow-hidden
        `}>
          <div className="h-full flex flex-col">
            {/* Header - Desktop only */}
            <div className="hidden md:flex items-center justify-between px-4 py-3 border-b border-gray-200 md:dark:border-gray-700 bg-transparent">
              <h3 className="font-semibold text-gray-900 dark:text-white">Live Chat</h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat liveStreamId={streamer.live_stream_id} />
            </div>
          </div>
        </div>

        {/* Chat Toggle (when closed) */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 md:right-0 md:top-1/2 bottom-4 md:bottom-auto left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 md:-translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full md:rounded-l-lg md:rounded-r-none p-3 md:p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-20"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 hidden md:block" />
            <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400 block md:hidden" />
          </button>
        )}
      </div>

      {/* Modals */}
      {showGiftModal && streamer && (
        <GiftModal
          recipientId={streamer.profile_id}
          recipientUsername={streamer.username}
          liveStreamId={streamer.live_stream_id}
          onGiftSent={() => {
            setShowGiftModal(false);
          }}
          onClose={() => setShowGiftModal(false)}
        />
      )}

      {showReportModal && streamer && (
        <ReportModal
          isOpen={showReportModal}
          reportType="stream"
          reportedUserId={streamer.profile_id}
          reportedUsername={streamer.username}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
