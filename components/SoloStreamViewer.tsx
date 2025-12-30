'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { 
  Heart, 
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
import { Room, RoomEvent } from 'livekit-client';
import { LIVEKIT_ROOM_NAME, DEBUG_LIVEKIT, TOKEN_ENDPOINT } from '@/lib/livekit-constants';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import Chat from './Chat';
import GiftModal from './GiftModal';
import ReportModal from './ReportModal';
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
  
  // LiveKit room connection
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
        const { data: liveStream, error: liveError } = await supabase
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
        console.error('Error loading streamer:', err);
        setError('Failed to load stream');
        setLoading(false);
      }
    };

    loadStreamer();
  }, [username, currentUserId, supabase]);

  // Connect to LiveKit room
  useEffect(() => {
    if (!streamer?.live_available || !streamer.profile_id) return;

    const connectToRoom = async () => {
      try {
        if (DEBUG_LIVEKIT) {
          console.log('[SoloStreamViewer] Connecting to room for:', streamer.username);
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        // Get LiveKit token
        const tokenResponse = await fetch(`${TOKEN_ENDPOINT}?userId=${currentUserId || 'anonymous'}&username=${streamer.username}`);
        const { token } = await tokenResponse.json();

        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
        setIsRoomConnected(true);

        // Handle track subscriptions
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Track subscribed:', {
              kind: track.kind,
              participant: participant.identity,
            });
          }

          if (track.kind === 'video' && videoRef.current) {
            track.attach(videoRef.current);
            
            // Detect aspect ratio
            const video = videoRef.current;
            const detectAspectRatio = () => {
              if (video.videoWidth && video.videoHeight) {
                const ratio = video.videoWidth / video.videoHeight;
                setVideoAspectRatio(ratio);
              }
            };
            
            video.addEventListener('loadedmetadata', detectAspectRatio);
            detectAspectRatio();
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Disconnected from room');
          }
          setIsRoomConnected(false);
        });

      } catch (err) {
        console.error('[SoloStreamViewer] Error connecting to room:', err);
      }
    };

    connectToRoom();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [streamer?.live_available, streamer?.profile_id, streamer?.username, currentUserId]);

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
      console.error('Error toggling follow:', err);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/live')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back to Browse
          </button>
          
          {/* Streamer Info */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src={getAvatarUrl(streamer.avatar_url, streamer.username)}
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
                    gifterStatus={streamer.gifter_status}
                    size="sm"
                    showTooltip={true}
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

        {/* Action Buttons */}
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

      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left/Center: Video Player */}
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 flex items-center justify-center relative">
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
                    src={getAvatarUrl(streamer.avatar_url, streamer.username)}
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

            {/* Volume Control Overlay */}
            {streamer.live_available && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
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
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2 font-medium"
              >
                <GiftIcon className="w-5 h-5" />
                Send Gift
              </button>
              
              <button
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="React"
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

          {/* Recommended Streams Carousel */}
          {recommendedStreams.length > 0 && (
            <div className="bg-gray-900 border-t border-gray-800 px-4 py-4">
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
                        src={getAvatarUrl(stream.avatar_url, stream.username)}
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

        {/* Right: Chat Panel */}
        <div className={`transition-all duration-300 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 ${
          isChatOpen ? 'w-96' : 'w-0'
        } overflow-hidden`}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Live Chat</h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat />
            </div>
          </div>
        </div>

        {/* Chat Toggle (when closed) */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-lg p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
          reportedUserId={streamer.profile_id}
          reportedUsername={streamer.username}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

