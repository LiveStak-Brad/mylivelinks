'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { 
  X,
  Eye,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Users,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Settings,
  Swords,
  Camera,
  Wand2
} from 'lucide-react';
import Image from 'next/image';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, TrackPublication, LocalTrackPublication } from 'livekit-client';
import { LIVEKIT_ROOM_NAME, DEBUG_LIVEKIT, TOKEN_ENDPOINT, canUserGoLive } from '@/lib/livekit-constants';
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
 * EXACT COPY of SoloStreamViewer layout with these changes:
 * 1. No back button (top-left)
 * 2. Flag button → X button (exit)
 * 3. Bottom action bar → Streamer options (co-host, guests, battle, filters)
 * 4. Auto-show setup modal on mount (permissions + stream title)
 * 5. Token: canPublish=true
 */
export default function SoloHostStream() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  
  const [streamer, setStreamer] = useState<StreamerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false); // Default closed on mobile, will be true on desktop via lg:block
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  // Stream setup modal
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [streamTitle, setStreamTitle] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  
  // LiveKit room connection
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isConnectingRef = useRef(false);
  const connectedUsernameRef = useRef<string | null>(null);
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

      const canLive = canUserGoLive({ id: user.id, email: user.email });
      if (!canLive) {
        setError('Go Live is currently limited to the owner account');
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

        const { data: liveStream } = await supabase
          .from('live_streams')
          .select('id, live_available, stream_title')
          .eq('profile_id', profile.id)
          .single();

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
        setStreamTitle(liveStream?.stream_title || '');
        setLoading(false);

      } catch (err) {
        console.error('[SoloHostStream] Error loading profile:', err);
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    loadStreamer();
  }, [currentUserId, supabase]);

  // Request camera/mic permissions automatically
  useEffect(() => {
    if (!showSetupModal || requestingPermissions || permissionsGranted) return;

    const requestPermissions = async () => {
      setRequestingPermissions(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        // Stop tracks immediately, we just needed to check permissions
        stream.getTracks().forEach(track => track.stop());
        setPermissionsGranted(true);
      } catch (err) {
        console.error('[SoloHostStream] Permission denied:', err);
        alert('Camera and microphone access is required to go live. Please allow access and try again.');
      } finally {
        setRequestingPermissions(false);
      }
    };

    requestPermissions();
  }, [showSetupModal, requestingPermissions, permissionsGranted]);

  // Connect to LiveKit room as HOST
  useEffect(() => {
    if (!streamer?.profile_id || !currentUserId) return;
    if (isConnectingRef.current || connectedUsernameRef.current === streamer.username) return;

    isConnectingRef.current = true;
    connectedUsernameRef.current = streamer.username;

    const connectToRoom = async () => {
      try {
        if (DEBUG_LIVEKIT) {
          console.log('[SoloHostStream] Connecting to room as HOST');
        }

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
            canPublish: true,  // ✅ HOST MODE
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
          console.log('[SoloHostStream] Token received, canPublish=true, role=host');
        }

        await room.connect(url, token);
        setIsRoomConnected(true);

        if (DEBUG_LIVEKIT) {
          console.log('[SoloHostStream] Connected as HOST');
        }

        // Listen for LOCAL tracks (host's own camera)
        room.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloHostStream] Local track published:', publication.kind);
          }
          
          if (publication.kind === Track.Kind.Video && videoRef.current && publication.track) {
            publication.track.attach(videoRef.current);
            
            const video = videoRef.current;
            const detectAspectRatio = () => {
              if (video.videoWidth && video.videoHeight) {
                const ratio = video.videoWidth / video.videoHeight;
                setVideoAspectRatio(ratio);
                if (DEBUG_LIVEKIT) {
                  console.log('[SoloHostStream] Local video aspect ratio:', ratio);
                }
              }
            };
            
            video.addEventListener('loadedmetadata', detectAspectRatio);
            detectAspectRatio();
          }
        });

        // Also listen for remote tracks (in case of co-hosts later)
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
          if (DEBUG_LIVEKIT) {
            console.log('[SoloHostStream] Remote track subscribed:', track.kind, 'from', participant.identity);
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
          setIsRoomConnected(false);
          isConnectingRef.current = false;
        });

        isConnectingRef.current = false;

      } catch (err) {
        console.error('[SoloHostStream] Error connecting to room:', err);
        isConnectingRef.current = false;
        connectedUsernameRef.current = null;
      }
    };

    connectToRoom();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      isConnectingRef.current = false;
      connectedUsernameRef.current = null;
      setIsRoomConnected(false);
    };
  }, [streamer?.profile_id, streamer?.username, currentUserId]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit? If you are live, your stream will end.')) {
      router.push('/');
    }
  };

  const handleStartStream = async () => {
    if (!streamTitle.trim()) {
      alert('Please enter a stream title');
      return;
    }

    // Update stream title in database
    if (streamer?.live_stream_id) {
      await supabase
        .from('live_streams')
        .update({ stream_title: streamTitle })
        .eq('id', streamer.live_stream_id);
    }

    setShowSetupModal(false);
  };

  const handleCancelStream = () => {
    router.push('/');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:bg-gray-50 lg:dark:bg-gray-900 overflow-hidden lg:overflow-auto">
      {/* Stream Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Ready to Go Live?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set up your stream
                </p>
              </div>
            </div>

            {/* Permissions Status */}
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                {requestingPermissions ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Requesting camera and microphone access...
                    </span>
                  </>
                ) : permissionsGranted ? (
                  <>
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      ✓ Camera and microphone access granted
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Waiting for permissions...
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Stream Title Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stream Title
              </label>
              <input
                type="text"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                placeholder="What's your stream about?"
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={!permissionsGranted}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {streamTitle.length}/100 characters
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelStream}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleStartStream}
                disabled={!permissionsGranted || !streamTitle.trim()}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: Top Navigation Bar (NO BACK BUTTON) */}
      <div className="hidden lg:flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 items-center justify-between">
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

        {/* Desktop Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
            <Eye className="w-4 h-4" />
            <span>{streamer.viewer_count.toLocaleString()}</span>
          </div>
          
          {/* Exit Button (replaces Flag button) */}
          <button
            onClick={handleExit}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Exit Stream"
          >
            <X className="w-5 h-5" />
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
              <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 shadow-lg flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">{streamer.viewer_count.toLocaleString()}</span>
              </div>
            </div>

            {/* Mobile/Tablet: X button + Streamer info overlay at top (NO BACK BUTTON) */}
            <div className="lg:hidden absolute top-4 left-0 right-4 z-20 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* X Button (exit - replaces back button) */}
                <button
                  onClick={handleExit}
                  className="text-white hover:opacity-80 transition-opacity"
                  title="Exit Stream"
                >
                  <X className="w-7 h-7" />
                </button>
                
                {/* Streamer Info */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-2 py-1.5">
                  <div className="flex items-center gap-2">
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
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow-400" />
                          <span className="font-semibold">Host</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                    Ready to go live?
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Click the "Go Live" button below to start streaming
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

            {/* Volume Control Overlay - Hidden on mobile */}
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

          {/* Bottom Streamer Options Bar (replaces viewer action bar) - Desktop only */}
          <div className="hidden lg:flex bg-gray-900 border-t border-gray-800 px-4 py-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <GoLiveButton 
                sharedRoom={roomRef.current}
                isRoomConnected={isRoomConnected}
              />
              
              <button
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
                title="Co-Host"
                disabled
              >
                <UserPlus className="w-5 h-5" />
                Co-Host
              </button>
              
              <button
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
                title="Guests"
                disabled
              >
                <Users className="w-5 h-5" />
                Guests
              </button>
              
              <button
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
                title="Battle"
                disabled
              >
                <Swords className="w-5 h-5" />
                Battle
              </button>
              
              <button
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Filters"
                disabled
              >
                <Wand2 className="w-5 h-5" />
              </button>
              
              <button
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Settings"
                disabled
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                Streaming as @{streamer.username}
              </span>
            </div>
          </div>
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
    </div>
  );
}
