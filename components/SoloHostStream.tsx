'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { 
  X,
  Eye,
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
import GoLiveButton from './GoLiveButton';

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

/**
 * Solo Host Stream Component
 * 
 * Host/streamer view for solo streaming.
 * Similar to SoloStreamViewer but optimized for the broadcaster:
 * - No back button (top-left)
 * - X button instead of flag (exit stream)
 * - Streamer controls instead of chat input
 * - Shows own camera preview
 */
export default function SoloHostStream() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  
  const [streamer, setStreamer] = useState<StreamerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [viewerCount, setViewerCount] = useState(0);
  
  // LiveKit room connection
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isConnectingRef = useRef(false);
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);

  // Get current user
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to stream');
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);
    };
    initUser();
  }, [supabase]);

  // Load streamer data (current user)
  useEffect(() => {
    if (!currentUserId) return;

    const loadStreamer = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch current user's profile
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
          .eq('id', currentUserId)
          .single();

        if (profileError || !profile) {
          setError('Failed to load your profile');
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
          viewer_count: 0,
          gifter_level: profile.gifter_level || 0,
          gifter_status: gifterStatus,
          stream_title: liveStream?.stream_title,
          live_stream_id: liveStream?.id,
        };

        setStreamer(streamerData);
        setLoading(false);

      } catch (err) {
        console.error('[SoloHostStream] Error loading profile:', err);
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    loadStreamer();
  }, [currentUserId, supabase]);

  // Connect to LiveKit room as HOST
  useEffect(() => {
    if (!streamer?.profile_id || !currentUserId) return;
    if (isConnectingRef.current) return;

    isConnectingRef.current = true;

    const connectToRoom = async () => {
      try {
        if (DEBUG_LIVEKIT) {
          console.log('[SoloHostStream] Connecting to room as HOST');
        }

        // Disconnect existing room
        if (roomRef.current) {
          roomRef.current.disconnect();
          roomRef.current = null;
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        // Get LiveKit token - HOST MODE
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName: LIVEKIT_ROOM_NAME,
            participantName: `host_${currentUserId}`,
            canPublish: true,  // ✅ HOST CAN PUBLISH
            canSubscribe: true,
            deviceType: 'web',
            deviceId: `solo_host_${Date.now()}`,
            sessionId: `solo_${Date.now()}`,
            role: 'host',
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to get token: ${tokenResponse.status}`);
        }

        const { token, url } = await tokenResponse.json();

        if (!token || !url) {
          throw new Error('Invalid token response');
        }

        if (DEBUG_LIVEKIT) {
          console.log('[SoloHostStream] Token received, connecting...');
        }

        await room.connect(url, token);
        setIsRoomConnected(true);

        if (DEBUG_LIVEKIT) {
          console.log('[SoloHostStream] Connected as HOST, canPublish=true');
        }

        // Handle track subscriptions (for preview - host can see their own stream)
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloHostStream] Track subscribed:', {
              kind: track.kind,
              participant: participant.identity,
            });
          }

          if (track.kind === Track.Kind.Video && videoRef.current) {
            track.attach(videoRef.current);
            
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

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloHostStream] Disconnected from room');
          }
          setIsRoomConnected(false);
          isConnectingRef.current = false;
        });

        isConnectingRef.current = false;

      } catch (err) {
        console.error('[SoloHostStream] Error connecting to room:', err);
        isConnectingRef.current = false;
      }
    };

    connectToRoom();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      isConnectingRef.current = false;
      setIsRoomConnected(false);
    };
  }, [streamer?.profile_id, currentUserId]);

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

  // Handle exit stream
  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit? If you are live, your stream will end.')) {
      router.push('/');
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
            {error || 'Failed to load'}
          </h1>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isPortraitVideo = videoAspectRatio < 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar - NO BACK BUTTON */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Streamer Info */}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Eye className="w-4 h-4" />
            <span>{viewerCount.toLocaleString()}</span>
          </div>
          
          {/* Exit Button (replaces Flag) */}
          <button
            onClick={handleExit}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Exit Stream"
          >
            <X className="w-5 h-5" />
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
                    src={getAvatarUrl(streamer.avatar_url)}
                    alt={streamer.username}
                    width={120}
                    height={120}
                    className="rounded-full mx-auto"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Ready to go live?
                </h3>
                <p className="text-gray-400 mb-4">
                  Click the "Go Live" button below to start streaming
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

          {/* Bottom Streamer Controls (replaces chat input) */}
          <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GoLiveButton 
                sharedRoom={roomRef.current}
                isRoomConnected={isRoomConnected}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                Streamer Controls
              </span>
            </div>
          </div>
        </div>

        {/* Right: Chat Panel (Read-only for host) */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Live Chat</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
