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
  VolumeX,
  Trophy
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
import ChatSettingsModal from './ChatSettingsModal';
import LeaderboardModal from './LeaderboardModal';
import ViewersModal from './ViewersModal';
import TrendingModal from './TrendingModal';
import MiniProfileModal from './MiniProfileModal';
import StreamGiftersModal from './StreamGiftersModal';
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

interface TopGifter {
  profile_id: string;
  username: string;
  avatar_url?: string;
  total_coins: number;
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
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showStreamGifters, setShowStreamGifters] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [recommendedStreams, setRecommendedStreams] = useState<RecommendedStream[]>([]);
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  
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

        // Fetch top 3 gifters for this streamer
        const { data: giftersData } = await supabase
          .from('gifts')
          .select(`
            sender_id,
            coin_value,
            profiles!gifts_sender_id_fkey (
              username,
              avatar_url
            )
          `)
          .eq('recipient_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(100); // Get recent gifts to calculate totals

        if (giftersData && giftersData.length > 0) {
          // Aggregate by sender and get top 3
          const gifterTotals = giftersData.reduce((acc: Record<string, any>, gift: any) => {
            const senderId = gift.sender_id;
            if (!acc[senderId]) {
              acc[senderId] = {
                profile_id: senderId,
                username: gift.profiles?.username || 'Unknown',
                avatar_url: gift.profiles?.avatar_url,
                total_coins: 0,
              };
            }
            acc[senderId].total_coins += gift.coin_value || 0;
            return acc;
          }, {});

          const top3 = Object.values(gifterTotals)
            .sort((a: any, b: any) => b.total_coins - a.total_coins)
            .slice(0, 3) as TopGifter[];

          setTopGifters(top3);
        } else {
          // TEMPORARY: Mock data for testing UI
          setTopGifters([
            {
              profile_id: 'mock1',
              username: 'TopSupporter',
              avatar_url: null,
              total_coins: 5000,
            },
            {
              profile_id: 'mock2',
              username: 'MegaFan',
              avatar_url: null,
              total_coins: 3500,
            },
            {
              profile_id: 'mock3',
              username: 'GiftKing',
              avatar_url: null,
              total_coins: 2000,
            },
          ]);
        }

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

        // Get LiveKit token - VIEWER MODE ONLY
        // (Hosts use /live/host route instead)
        const viewerIdentity = currentUserId || `anon_${Date.now()}`;
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName: LIVEKIT_ROOM_NAME,
            participantName: `viewer_${viewerIdentity}`,
            canPublish: false,  // VIEWER MODE
            canSubscribe: true,
            deviceType: 'web',
            deviceId: `solo_viewer_${Date.now()}`,
            sessionId: `solo_${Date.now()}`,
            role: 'viewer',
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:bg-gray-50 lg:dark:bg-gray-900 overflow-hidden lg:overflow-auto">
      <div className="hidden lg:flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/live')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Back to Browse"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Eye className="w-4 h-4" />
            <span>{streamer.viewer_count.toLocaleString()}</span>
          </div>
          
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

      {/* Main Content Area - Desktop: normal layout with header, Mobile/Tablet: full screen */}
      <div className="flex relative h-screen lg:h-[calc(100vh-73px)] pt-0 lg:pt-0 overflow-hidden">
        {/* Left/Center: Video Player */}
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 flex items-center justify-center relative">
            {/* Mobile/Tablet: Viewers - Top center */}
            <div className="lg:hidden absolute top-4 left-1/2 -translate-x-1/2 z-50">
              <button
                onClick={() => {
                  console.log('[ViewerButton] Clicked! Opening viewers modal');
                  setShowViewers(true);
                }}
                className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 shadow-lg flex items-center gap-1.5 hover:bg-black/50 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">{streamer.viewer_count.toLocaleString()}</span>
              </button>
            </div>

            {/* Mobile/Tablet: Back button + Streamer info overlay at top */}
            <div className="lg:hidden absolute top-4 left-0 right-4 z-20 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Back Button */}
                <button
                  onClick={() => router.push('/live')}
                  className="text-white hover:opacity-80 transition-opacity"
                  title="Back to Browse"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                
                {/* Streamer Info */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-2 py-1.5">
                  <button 
                    onClick={() => setShowMiniProfile(true)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src={getAvatarUrl(streamer.avatar_url)}
                      alt={streamer.username}
                      width={28}
                      height={28}
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
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTrending(true);
                          }}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-yellow-400" />
                          <span className="font-semibold">12</span>
                        </button>
                        <span className="text-white/40">•</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLeaderboard(true);
                          }}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <Trophy className="w-3 h-3 text-yellow-500" />
                          <span className="font-semibold">8</span>
                        </button>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Mobile action buttons */}
              <div className="flex items-center gap-2">
                {/* Top 3 Gifters - small bubbles */}
                {topGifters.length > 0 && (
                  <div className="flex items-center gap-1">
                    {topGifters.map((gifter, index) => {
                      const colors = [
                        { border: 'ring-yellow-400', bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600' }, // Gold
                        { border: 'ring-gray-300', bg: 'bg-gradient-to-br from-gray-300 to-gray-400' },       // Silver
                        { border: 'ring-orange-600', bg: 'bg-gradient-to-br from-orange-600 to-orange-800' }, // Bronze
                      ];
                      const color = colors[index];
                      
                      return (
                        <button
                          key={gifter.profile_id}
                          onClick={() => setShowStreamGifters(true)}
                          className={`flex items-center justify-center ${color.bg} rounded-full p-[2px] w-9 h-9 hover:scale-110 transition-transform cursor-pointer`}
                          title={`${gifter.username} - ${gifter.total_coins.toLocaleString()} coins`}
                        >
                          <Image
                            src={getAvatarUrl(gifter.avatar_url)}
                            alt={gifter.username}
                            width={28}
                            height={28}
                            className="rounded-full"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
                
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
              <>
                {/* Desktop: Centered offline message */}
                <div className="hidden md:block text-center text-white">
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
                
                {/* Mobile: Full-screen profile photo */}
                <div className="md:hidden w-full h-full relative">
                  <Image
                    src={getAvatarUrl(streamer.avatar_url)}
                    alt={streamer.username}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
              </>
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

          {/* Bottom Action Bar - Desktop only */}
          <div className="hidden lg:flex bg-gray-900 border-t border-gray-800 px-4 py-3 items-center justify-between">
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
          
          /* Mobile/Tablet: Fixed full-width overlay at bottom */
          ${isChatOpen ? 'fixed' : 'hidden'}
          lg:block
          bottom-4 left-0 right-0 w-full
          h-[40vh]
          bg-transparent lg:bg-white lg:dark:bg-gray-800
          backdrop-blur-none lg:backdrop-blur-none
          border-t border-transparent lg:border-white/10 dark:border-transparent lg:dark:border-white/10
          z-20
          
          pb-0
          
          /* Desktop: Sidebar on right */
          lg:relative
          lg:bottom-auto lg:left-auto lg:right-0
          lg:h-full
          ${isChatOpen ? 'lg:w-96' : 'lg:w-0'}
          lg:bg-white lg:dark:bg-gray-800
          lg:backdrop-blur-none
          lg:border-t-0 lg:border-l lg:border-gray-200 lg:dark:border-gray-700
          overflow-hidden
        `}>
          <div className="h-full flex flex-col">
            {/* Header - Desktop only */}
            <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-gray-200 lg:dark:border-gray-700 bg-transparent">
              <h3 className="font-semibold text-gray-900 dark:text-white">Live Chat</h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat 
                liveStreamId={streamer.live_stream_id} 
                onGiftClick={() => setShowGiftModal(true)}
                onShareClick={handleShare}
                onSettingsClick={() => setShowChatSettings(true)}
              />
            </div>
          </div>
        </div>

        {/* Chat Toggle (when closed) - Desktop only */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="hidden lg:block fixed right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-lg p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-20"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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

      {/* Chat Settings Modal */}
      <ChatSettingsModal
        isOpen={showChatSettings}
        onClose={() => setShowChatSettings(false)}
        currentUserId={currentUserId}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      {/* Viewers Modal */}
      <ViewersModal
        isOpen={showViewers}
        onClose={() => setShowViewers(false)}
        liveStreamId={streamer.live_stream_id}
      />

      {/* Trending Modal */}
      <TrendingModal
        isOpen={showTrending}
        onClose={() => setShowTrending(false)}
      />

      {/* Mini Profile Modal */}
      <MiniProfileModal
        isOpen={showMiniProfile}
        onClose={() => setShowMiniProfile(false)}
        profileId={streamer.profile_id}
        username={streamer.username}
        onMessageClick={() => {
          setShowMiniProfile(false);
          openIM(streamer.profile_id, streamer.username);
        }}
        onReportClick={() => {
          setShowMiniProfile(false);
          setShowReportModal(true);
        }}
      />

      {/* Stream Top Gifters Modal */}
      <StreamGiftersModal
        isOpen={showStreamGifters}
        onClose={() => setShowStreamGifters(false)}
        liveStreamId={streamer.live_stream_id}
        streamUsername={streamer.username}
        onGifterClick={(profileId, username) => {
          setShowStreamGifters(false);
          setShowMiniProfile(true);
        }}
      />
    </div>
  );
}
