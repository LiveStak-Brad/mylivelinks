'use client';

/**
 * ⚠️ CRITICAL: DO NOT MODIFY LAYOUT OR ADD UI ELEMENTS WITHOUT EXPLICIT REQUEST ⚠️
 * 
 * This is the SOLO STREAM HOST component. The layout and UI are finalized.
 * DO NOT add buttons, overlays, or modify the layout structure without being explicitly asked.
 * All UI modifications must be approved first.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { 
  X,
  Eye,
  Volume2,
  VolumeX,
  Flame,
  Trophy,
  Users,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Settings,
  Swords,
  Camera,
  Wand2,
  Share2,
  Filter
} from 'lucide-react';
import Image from 'next/image';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, TrackPublication, LocalTrackPublication } from 'livekit-client';
import { LIVEKIT_ROOM_NAME, DEBUG_LIVEKIT, TOKEN_ENDPOINT, canUserGoLive } from '@/lib/livekit-constants';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import Chat from './Chat';
import StreamChat from './StreamChat';
import GoLiveButton from './GoLiveButton';
import LeaderboardModal from './LeaderboardModal';
import ViewersModal from './ViewersModal';
import TrendingModal from './TrendingModal';
import StreamGiftersModal from './StreamGiftersModal';
import MiniProfileModal from './MiniProfileModal';
import { useIM } from '@/components/im';

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

interface TopGifter {
  profile_id: string;
  username: string;
  avatar_url?: string;
  total_coins: number;
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
  const { openChat: openIM } = useIM();
  
  const [streamer, setStreamer] = useState<StreamerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isPublishing, setIsPublishing] = useState(false); // Track if we're publishing
  const [shouldAutoStartStream, setShouldAutoStartStream] = useState(false); // Trigger from modal
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showStreamGifters, setShowStreamGifters] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  
  // Stream setup modal
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [streamTitle, setStreamTitle] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  
  // LiveKit room connection
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const goLiveButtonRef = useRef<HTMLButtonElement | null>(null);
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
          .select('id, live_available, started_at')
          .eq('profile_id', profile.id)
          .eq('streaming_mode', 'solo') // Only solo mode streams
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const gifterStatuses = await fetchGifterStatuses([profile.id]);
        const gifterStatus = gifterStatuses[profile.id] || null;

        // Load top 3 gifters for this streamer
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
          .limit(100);

        if (giftersData && giftersData.length > 0) {
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
          // Mock data for testing
          setTopGifters([
            {
              profile_id: 'mock1',
              username: 'TopSupporter',
              avatar_url: undefined,
              total_coins: 5000,
            },
            {
              profile_id: 'mock2',
              username: 'MegaFan',
              avatar_url: undefined,
              total_coins: 3500,
            },
            {
              profile_id: 'mock3',
              username: 'GiftKing',
              avatar_url: undefined,
              total_coins: 2000,
            },
          ]);
        }

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
          stream_title: undefined, // No stream_title column
          live_stream_id: liveStream?.id,
        };

        setStreamer(streamerData);
        setStreamTitle(''); // Default empty
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
        console.log('[SoloHostStream] Requesting camera/mic permissions...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        // Stop tracks immediately, we just needed to check permissions
        stream.getTracks().forEach(track => track.stop());
        console.log('[SoloHostStream] ✅ Permissions granted!');
        setPermissionsGranted(true);
        setRequestingPermissions(false);
      } catch (err: any) {
        console.error('[SoloHostStream] ❌ Permission denied:', err);
        setRequestingPermissions(false);
        
        // Show error and keep trying
        const retry = window.confirm(
          'Camera and microphone access is required to go live.\n\n' +
          'Please click "Allow" in your browser, then click OK to try again.\n\n' +
          `Error: ${err.name === 'NotAllowedError' ? 'Permission denied' : err.message}`
        );
        
        if (retry) {
          // Try again after a short delay
          setTimeout(() => {
            setRequestingPermissions(false);
          }, 500);
        } else {
          // User cancelled, go back
          router.push('/');
        }
      }
    };

    requestPermissions();
  }, [showSetupModal, requestingPermissions, permissionsGranted, router]);

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
          console.log('[SoloHostStream] Connected as HOST', {
            canPublish: room.localParticipant.permissions?.canPublish,
            identity: room.localParticipant.identity
          });
        }

        // Log all room events for debugging
        console.log('[SoloHostStream] Setting up event listeners, videoRef.current:', !!videoRef.current);

        // Listen for LOCAL tracks (host's own camera)
        room.on(RoomEvent.LocalTrackPublished, (publication) => {
          console.log('[SoloHostStream] ✅ Local track published:', {
            kind: publication.kind,
            trackSid: publication.trackSid,
            hasTrack: !!publication.track,
            hasVideoRef: !!videoRef.current
          });
          
          if (publication.kind === Track.Kind.Video) {
            setIsPublishing(true); // Show video when we start publishing
            
            if (videoRef.current && publication.track) {
              console.log('[SoloHostStream] 🎥 Attaching local video track to video element');
              publication.track.attach(videoRef.current);
              
              const video = videoRef.current;
              const detectAspectRatio = () => {
                if (video.videoWidth && video.videoHeight) {
                  const ratio = video.videoWidth / video.videoHeight;
                  setVideoAspectRatio(ratio);
                  console.log('[SoloHostStream] 📐 Video aspect ratio:', ratio);
                }
              };
              
              video.addEventListener('loadedmetadata', detectAspectRatio);
              detectAspectRatio();
            } else {
              console.error('[SoloHostStream] ❌ Cannot attach video - videoRef:', !!videoRef.current, 'track:', !!publication.track);
            }
          }
        });

        room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          console.log('[SoloHostStream] Local track unpublished:', publication.kind);
          if (publication.kind === Track.Kind.Video) {
            setIsPublishing(false);
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

    console.log('[SoloHostStream] User clicked Go Live from modal');
    setShowSetupModal(false);
    
    // Click the hidden GoLiveButton
    setTimeout(() => {
      if (goLiveButtonRef.current) {
        console.log('[SoloHostStream] Triggering GoLiveButton click');
        goLiveButtonRef.current.click();
      } else {
        console.error('[SoloHostStream] GoLiveButton ref not found!');
      }
    }, 100);
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
                    <div className="flex-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Camera and microphone access required
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setRequestingPermissions(false);
                        setPermissionsGranted(false);
                      }}
                      className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                    >
                      Grant Access
                    </button>
                  </>
                )}
              </div>
              {!permissionsGranted && !requestingPermissions && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Click "Grant Access" and allow camera/microphone in your browser
                </p>
              )}
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
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔴 Go Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Fullscreen with overlay UI on all screen sizes */}
      <div className="flex relative h-screen pt-0 overflow-hidden">
        {/* Left/Center: Video Player */}
        <div 
          className="flex-1 flex flex-col bg-black"
        >
          <div className="flex-1 flex items-center justify-center relative">
            {/* Black gradient overlays - darker/taller at top for status bar, strong at bottom covering chat */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black via-black/70 to-transparent z-[15] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black via-black/90 to-transparent z-[15] pointer-events-none" />
            
            {/* Top row - all screen sizes (with safe area support on mobile) */}
            <div className="absolute z-20 flex items-center justify-between lg:top-4 lg:left-4 lg:right-4" style={{ top: 'max(1rem, env(safe-area-inset-top))', left: '1rem', right: '1rem' }}>
              {/* Mobile: Top gifters vertical stack on the left */}
              {topGifters.length > 0 && (
                <div className="md:hidden absolute left-2 top-16 flex flex-col gap-2 z-30">
                  {topGifters.slice(0, 3).map((gifter, index) => {
                    const colors = [
                      { border: 'ring-yellow-400', bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600' },
                      { border: 'ring-gray-300', bg: 'bg-gradient-to-br from-gray-300 to-gray-400' },
                      { border: 'ring-orange-600', bg: 'bg-gradient-to-br from-orange-600 to-orange-800' },
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

              {/* Left: Streamer name bubble */}
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Image
                    src={getAvatarUrl(streamer.avatar_url)}
                    alt={streamer.username}
                    width={28}
                    height={28}
                    className="rounded-full cursor-pointer"
                    onClick={() => setShowMiniProfile(true)}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-bold text-white text-sm cursor-pointer hover:opacity-80"
                        onClick={() => setShowMiniProfile(true)}
                      >
                        {streamer.display_name || streamer.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      <button 
                        onClick={() => setShowTrending(true)}
                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                        type="button"
                      >
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold text-sm">12</span>
                      </button>
                      <span className="text-white/40">•</span>
                      <button 
                        onClick={() => setShowLeaderboard(true)}
                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                        type="button"
                      >
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold text-sm">8</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Center: Viewer count */}
              <button
                onClick={() => setShowViewers(true)}
                className="absolute left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 shadow-lg flex items-center gap-1.5 hover:bg-black/50 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">{streamer.viewer_count.toLocaleString()}</span>
              </button>
              
              {/* Right: Top 3 Gifters + X + Share (vertical stack) */}
              <div className="flex items-center gap-2">
                {/* Top 3 Gifters - small bubbles */}
                {topGifters.length > 0 && (
                  <div className="hidden md:flex items-center gap-1">
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
                
                {/* X Button - inline with gifters */}
                <button
                  onClick={handleExit}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                  title="Exit Stream"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {/* Share Button - Below X, positioned absolutely */}
                <button
                  onClick={() => {
                    // Share functionality
                    if (navigator.share) {
                      navigator.share({
                        title: `Watch ${streamer.display_name || streamer.username} live!`,
                        url: window.location.href,
                      });
                    }
                  }}
                  className="absolute top-14 right-0 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video element - always rendered for host */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={true}
              className={`
                w-full h-full object-cover
                lg:max-w-full lg:max-h-full lg:object-contain
                ${isPortraitVideo ? 'lg:h-full lg:w-auto' : 'lg:w-full lg:h-auto'}
              `}
              style={{
                display: isPublishing ? 'block' : 'none',
                position: 'relative',
                zIndex: 10
              }}
            />

            {/* Offline placeholder */}
            {!isPublishing && (
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

          {/* Bottom Streamer Options Bar - Floating at bottom, spread wide */}
          <div className="absolute bottom-4 left-4 right-4 z-30">
            {/* Hidden GoLiveButton - CRITICAL for publishing, positioned off-screen but functional */}
            <div className="fixed -left-[9999px]" ref={(el) => {
              // Find the actual button inside GoLiveButton component
              if (el) {
                const btn = el.querySelector('button');
                if (btn) goLiveButtonRef.current = btn;
              }
            }}>
              <GoLiveButton 
                sharedRoom={roomRef.current}
                isRoomConnected={isRoomConnected}
                publishAllowed={true}
                mode="solo"
                onPublishingChange={(publishing) => {
                  console.log('[SoloHostStream] GoLiveButton publishing state changed:', publishing);
                  setIsPublishing(publishing);
                }}
                onGoLive={(liveStreamId, profileId) => {
                  console.log('🆕🆕🆕 [SoloHostStream] NEW STREAM CREATED! live_stream_id:', liveStreamId);
                  console.log('🆕🆕🆕 [SoloHostStream] Profile ID:', profileId);
                  if (liveStreamId) {
                    console.log('🆕🆕🆕 [SoloHostStream] Updating streamer state with NEW live_stream_id');
                    setStreamer(prev => {
                      console.log('🆕🆕🆕 [SoloHostStream] Previous streamer:', prev);
                      const updated = prev ? { ...prev, live_stream_id: liveStreamId } : prev;
                      console.log('🆕🆕🆕 [SoloHostStream] Updated streamer:', updated);
                      return updated;
                    });
                  } else {
                    // Fallback: fetch the live_stream_id from database
                    console.warn('[SoloHostStream] No live_stream_id provided, fetching from database');
                    supabase
                      .from('live_streams')
                      .select('id')
                      .eq('profile_id', profileId)
                      .eq('live_available', true)
                      .eq('streaming_mode', 'solo') // Only solo mode streams
                      .single()
                      .then(({ data, error }) => {
                        if (data && !error) {
                          console.log('[SoloHostStream] Fetched live_stream_id:', data.id);
                          setStreamer(prev => prev ? { ...prev, live_stream_id: data.id } : prev);
                        }
                      });
                  }
                }}
              />
            </div>
            
            <div className="flex items-center justify-around bg-black/50 backdrop-blur-md rounded-full px-4 py-1 shadow-lg max-w-4xl mx-auto">
              <button
                className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors"
                title="Battle"
                disabled
              >
                <Swords className="w-6 h-6" />
              </button>
              
              <button
                className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors"
                title="Co-Host"
                disabled
              >
                <UserPlus className="w-6 h-6" />
              </button>
              
              <button
                className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors"
                title="Guests"
                disabled
              >
                <Users className="w-6 h-6" />
              </button>
              
              <button
                className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors"
                title="Settings"
                disabled
              >
                <Settings className="w-6 h-6" />
              </button>
              
              <button
                className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors"
                title="Filters"
                disabled
              >
                <Filter className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Chat Panel - All screen sizes: overlay at bottom (above streamer options), no header/border */}
        <div className={`
          transition-all duration-300
          fixed
          block
          bottom-20 left-0 right-0
          w-full
          h-[30vh]
          bg-transparent
          backdrop-blur-none
          border-0
          z-20
          pb-0
        `}>
          <div className="h-full flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
              {streamer.live_stream_id ? (
                <StreamChat 
                  liveStreamId={streamer.live_stream_id}
                  readOnly={true}
                  alwaysAutoScroll={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white/60">
                  <p>Go live to enable chat</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {/* Stream Top Gifters Modal */}
      <StreamGiftersModal
        isOpen={showStreamGifters}
        onClose={() => setShowStreamGifters(false)}
        liveStreamId={streamer.live_stream_id}
        streamUsername={streamer.username}
        onGifterClick={(profileId, username) => {
          setShowStreamGifters(false);
        }}
      />

      {/* Mini Profile Modal - for viewing own stats */}
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
          // Host can't report themselves, but keeping interface consistent
          setShowMiniProfile(false);
        }}
      />
    </div>
  );
}
