'use client';

/**
 * ⚠️ CRITICAL: DO NOT MODIFY LAYOUT OR ADD UI ELEMENTS WITHOUT EXPLICIT REQUEST ⚠️
 * 
 * This is the SOLO STREAM VIEWER component. The layout and UI are finalized.
 * DO NOT add buttons, overlays, or modify the layout structure without being explicitly asked.
 * All UI modifications must be approved first.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { 
  Share2, 
  Gift as GiftIcon, 
  Flag,
  UserPlus,
  UserMinus,
  ChevronRight,
  ChevronLeft,
  Eye,
  Flame,
  Volume2,
  VolumeX,
  Trophy,
  Star
} from 'lucide-react';
import Image from 'next/image';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, TrackPublication } from 'livekit-client';
import { LIVEKIT_ROOM_NAME, DEBUG_LIVEKIT, TOKEN_ENDPOINT } from '@/lib/livekit-constants';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import Chat from './Chat';
import StreamChat from './StreamChat';
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
import { useViewerHeartbeat } from '@/hooks/useViewerHeartbeat';

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
  const [isFollowLoading, setIsFollowLoading] = useState(false);
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
  const [streamEnded, setStreamEnded] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  // LiveKit room connection - SINGLE connection per mount
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isConnectingRef = useRef(false); // Guard against duplicate connects
  const connectedUsernameRef = useRef<string | null>(null); // Track who we're connected to
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);

  const resumePlayback = useCallback(
    async (source: string) => {
      const v = videoRef.current;
      const a = audioRef.current;

      try {
        if (v) {
          v.muted = isMuted;
          v.volume = Math.max(0, Math.min(1, volume));
        }
        if (a) {
          a.muted = isMuted;
          a.volume = Math.max(0, Math.min(1, volume));
        }

        const vp = v ? v.play() : null;
        const ap = a ? a.play() : null;

        if (vp && typeof (vp as any).catch === 'function') {
          (vp as any).catch((err: any) => {
            if (DEBUG_LIVEKIT) {
              console.log('[SoloStreamViewer] play() rejected', { source, kind: 'video', err: String(err) });
            }
          });
        }
        if (ap && typeof (ap as any).catch === 'function') {
          (ap as any).catch((err: any) => {
            if (DEBUG_LIVEKIT) {
              console.log('[SoloStreamViewer] play() rejected', { source, kind: 'audio', err: String(err) });
            }
          });
        }
      } catch (err: any) {
        if (DEBUG_LIVEKIT) {
          console.log('[SoloStreamViewer] resumePlayback error', { source, err: String(err) });
        }
      }
    },
    [isMuted, volume]
  );

  const lastVideoTimeRef = useRef<number>(0);
  const lastVideoProgressAtRef = useRef<number>(0);

  // Viewer heartbeat + live viewer count updates
  const watchSessionKey = useMemo(() => {
    if (!streamer?.live_stream_id || !currentUserId) return null;
    return `solo:${currentUserId}:${streamer.live_stream_id}`;
  }, [currentUserId, streamer?.live_stream_id]);

  useViewerHeartbeat({
    liveStreamId: streamer?.live_stream_id || 0,
    isActive: !!(streamer?.live_available && isRoomConnected && !streamEnded),
    isUnmuted: !isMuted,
    isVisible: true,
    isSubscribed: !!isRoomConnected,
    enabled: !!(streamer?.live_stream_id && streamer?.live_available),
    slotIndex: 0,
    watchSessionKey: watchSessionKey || undefined,
  });

  useEffect(() => {
    if (!streamer?.live_stream_id) return;

    let cancelled = false;

    const loadViewerCount = async () => {
      try {
        const res = await fetch(`/api/active-viewers?live_stream_id=${streamer.live_stream_id}`);
        if (!res.ok) {
          console.error('[SoloStreamViewer] Viewer count fetch failed:', res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled && typeof data.viewer_count === 'number') {
          setStreamer((prev) =>
            prev
              ? {
                  ...prev,
                  viewer_count: data.viewer_count,
                }
              : prev
          );
        }
      } catch (err) {
        console.error('[SoloStreamViewer] Error loading viewer count:', err);
      }
    };

    loadViewerCount();
    const interval = setInterval(loadViewerCount, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamer?.live_stream_id]);

  // Service-role heartbeat to ensure viewers are counted even if RLS blocks client RPC
  useEffect(() => {
    if (!streamer?.live_stream_id || !currentUserId) return;

    let cancelled = false;

    const ping = async (is_active = true) => {
      try {
        await fetch('/api/active-viewers/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            live_stream_id: streamer.live_stream_id,
            viewer_id: currentUserId,
            is_active,
            is_unmuted: !isMuted,
            is_visible: true,
            is_subscribed: true,
          }),
        });
      } catch (err) {
        console.error('[SoloStreamViewer] Service heartbeat failed:', err);
      }
    };

    // initial and interval
    ping(true);
    const interval = setInterval(() => {
      if (!cancelled) ping(true);
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      // Best effort cleanup
      void ping(false);
    };
  }, [streamer?.live_stream_id, currentUserId, isMuted]);

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

        // Fetch live stream data - get the most recent active solo stream
        const { data: liveStreams } = await supabase
          .from('live_streams')
          .select('id, live_available')
          .eq('profile_id', profile.id)
          .eq('streaming_mode', 'solo') // Only solo mode streams
          .order('started_at', { ascending: false })
          .limit(1);

        const liveStream = liveStreams?.[0] || null;

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
          stream_title: undefined, // Column doesn't exist yet
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
    // Connect only if streamer is live (avoid token calls / LiveKit connect when offline)
    if (!streamer?.profile_id || !streamer.username || !streamer.live_available) return;

    // Guard: Only one connect per mount, and only if username changed
    const targetUsername = streamer.username;
    if (isConnectingRef.current || connectedUsernameRef.current === targetUsername) {
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
        // CRITICAL: If viewing your own stream, use a separate viewer identity to avoid conflicts
        const isOwnStream = currentUserId === streamer.profile_id;
        const viewerIdentity = isOwnStream 
          ? `${currentUserId}_viewer_${Date.now()}` 
          : (currentUserId || `anon_${Date.now()}`);
        
        console.log('[SoloStreamViewer] Connecting as viewer:', { 
          viewerIdentity, 
          isOwnStream, 
          currentUserId, 
          streamerProfileId: streamer.profile_id 
        });

        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName: LIVEKIT_ROOM_NAME,
            participantName: `viewer_${viewerIdentity}`,
            canPublish: false,  // VIEWER MODE - never publish
            canSubscribe: true,
            deviceType: 'web',
            deviceId: `solo_viewer_${Date.now()}`,
            sessionId: `solo_viewer_${Date.now()}`,
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

        console.log('[SoloStreamViewer] ✅ Connected! Room participants:', room.remoteParticipants.size);
        console.log('[SoloStreamViewer] 🎥 Local participant:', room.localParticipant.identity);
        console.log('[SoloStreamViewer] 👥 Remote participants:', Array.from(room.remoteParticipants.values()).map(p => ({
          identity: p.identity,
          isSpeaking: p.isSpeaking,
          trackCount: p.trackPublications.size,
          tracks: Array.from(p.trackPublications.values()).map(pub => ({
            kind: pub.kind,
            source: pub.source,
            subscribed: pub.isSubscribed,
          }))
        })));

        // CRITICAL: Manually attach existing tracks (for when we join AFTER host is already live)
        room.remoteParticipants.forEach((participant) => {
          console.log('[SoloStreamViewer] 🔍 Checking existing participant:', participant.identity);
          participant.trackPublications.forEach((publication) => {
            console.log('[SoloStreamViewer] 📹 Found existing track publication:', {
              kind: publication.kind,
              source: publication.source,
              subscribed: publication.isSubscribed,
              track: publication.track,
            });
            
            if (publication.track && publication.kind === Track.Kind.Video && videoRef.current) {
              console.log('[SoloStreamViewer] 🎥 Attaching EXISTING video track to video element');
              publication.track.attach(videoRef.current);
              
              // Detect aspect ratio
              const video = videoRef.current;
              const detectAspectRatio = () => {
                if (video.videoWidth && video.videoHeight) {
                  const ratio = video.videoWidth / video.videoHeight;
                  setVideoAspectRatio(ratio);
                  console.log('[SoloStreamViewer] Video aspect ratio:', ratio);
                }
              };
              
              video.addEventListener('loadedmetadata', detectAspectRatio);
              detectAspectRatio();
            }

            if (publication.track && publication.kind === Track.Kind.Audio && audioRef.current) {
              console.log('[SoloStreamViewer] 🔊 Attaching EXISTING audio track to audio element');
              publication.track.attach(audioRef.current);
            }

            void resumePlayback('existing_track_attach');
          });
        });

        if (DEBUG_LIVEKIT) {
          console.log('[SoloStreamViewer] Connected to room, participants:', room.remoteParticipants.size);
        }

        // Handle track subscriptions - subscribe to streamer's tracks
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) => {
          console.log('[SoloStreamViewer] 🎬 Track subscribed!', {
            kind: track.kind,
            participant: participant.identity,
            source: (publication as any)?.source,
            sid: track.sid,
          });

          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Track subscribed:', {
              kind: track.kind,
              participant: participant.identity,
              source: (publication as any)?.source,
            });
          }

          // Attach video + audio tracks
          if (track.kind === Track.Kind.Video && videoRef.current) {
            console.log('[SoloStreamViewer] 🎥 Attaching VIDEO track to video element');
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

          if (track.kind === Track.Kind.Audio && audioRef.current) {
            console.log('[SoloStreamViewer] 🔊 Attaching AUDIO track to audio element');
            track.attach(audioRef.current);
          }

          void resumePlayback('track_subscribed');
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach();
        });

        room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log('[SoloStreamViewer] 👋 Participant joined:', {
            identity: participant.identity,
            trackCount: participant.trackPublications.size,
          });
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
          void resumePlayback('room_reconnected');
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
  }, [resumePlayback, streamer?.live_available, streamer?.profile_id, streamer?.username]); // STABLE DEPS: only reconnect if these change

  useEffect(() => {
    if (!streamer?.live_available) return;

    const v = videoRef.current;
    if (!v) return;

    const onWaiting = () => {
      void resumePlayback('video_waiting');
    };
    const onStalled = () => {
      void resumePlayback('video_stalled');
    };

    v.addEventListener('waiting', onWaiting);
    v.addEventListener('stalled', onStalled);

    lastVideoTimeRef.current = Number.isFinite(v.currentTime) ? v.currentTime : 0;
    lastVideoProgressAtRef.current = Date.now();

    const interval = setInterval(() => {
      const el = videoRef.current;
      if (!el) return;
      const t = Number(el.currentTime);
      if (Number.isFinite(t) && t > lastVideoTimeRef.current + 0.02) {
        lastVideoTimeRef.current = t;
        lastVideoProgressAtRef.current = Date.now();
        return;
      }

      const stalledForMs = Date.now() - lastVideoProgressAtRef.current;
      if (stalledForMs >= 6000) {
        lastVideoProgressAtRef.current = Date.now();
        void resumePlayback('watchdog');
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('stalled', onStalled);
    };
  }, [resumePlayback, streamer?.live_available, streamer?.username]);

  // Subscribe to stream status changes (detect when stream ends)
  useEffect(() => {
    if (!streamer?.live_stream_id) return;

    const streamChannel = supabase
      .channel(`stream-status:${streamer.live_stream_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamer.live_stream_id}`,
        },
        (payload: any) => {
          const newData = payload.new as any;
          
          // Stream ended - show UI and redirect
          if (newData.live_available === false) {
            console.log('[SoloStreamViewer] Stream ended, showing end screen');
            setStreamEnded(true);
            
            // Disconnect LiveKit room
            if (roomRef.current) {
              roomRef.current.disconnect();
              roomRef.current = null;
            }
          }
        }
      )
      .subscribe();

    return () => {
      streamChannel.unsubscribe();
    };
  }, [streamer?.live_stream_id, supabase]);

  // Countdown timer for auto-redirect after stream ends
  useEffect(() => {
    if (!streamEnded) return;

    // Start countdown from 5 seconds
    setCountdown(5);
    
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Redirect to LiveTV main page
          router.push('/liveTV');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [streamEnded, router]);

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
        .eq('streaming_mode', 'solo') // Only solo mode streams
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
    
    setIsFollowLoading(true);
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
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Handle share
  const handleShare = () => {
    if (!streamer) return;
    const shareUrl = `https://www.mylivelinks.com/live/${encodeURIComponent(streamer.username)}`;
    if (navigator.share) {
      navigator
        .share({
          title: `${streamer.display_name || streamer.username}'s Live Stream`,
          text: `Watch ${streamer.display_name || streamer.username} live on MyLiveLinks!`,
          url: shareUrl,
        })
        .catch(() => {
          navigator.clipboard.writeText(shareUrl);
        });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
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
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
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
            onClick={() => router.push('/liveTV')}
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
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Main Content Area - Fullscreen on all screen sizes */}
      <div className="flex relative h-screen pt-0 overflow-hidden">
        {/* Left/Center: Video Player */}
        <div 
          className="flex-1 flex flex-col bg-black"
        >
          <div className="flex-1 flex items-center justify-center relative">
            {/* Black gradient overlays - darker/taller at top for status bar, strong at bottom covering chat */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black via-black/70 to-transparent z-[15] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black via-black/90 to-transparent z-[15] pointer-events-none" />
            
            {/* Viewers count - Top center (with safe area support on mobile) */}
            <div className="absolute left-1/2 -translate-x-1/2 z-50 lg:top-4" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
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

            {/* Top row - all screen sizes (with safe area support on mobile) */}
            <div
              className="absolute z-20 flex items-center justify-between w-full"
              style={{ 
                top: 'max(1rem, env(safe-area-inset-top))',
                paddingLeft: '0', // ALL THE WAY LEFT - NO PADDING
                paddingRight: '1rem'
              }}
            >
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

              <div className="flex items-center gap-1">
                {/* Back Button - ALL THE WAY LEFT */}
                <button
                  onClick={() => router.push('/liveTV')}
                  className="lg:hidden text-white hover:opacity-80 transition-opacity"
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
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTrending(true);
                          }}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="font-semibold text-sm">12</span>
                        </button>
                        <span className="text-white/40">•</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLeaderboard(true);
                          }}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold text-sm">8</span>
                        </button>
                      </div>
                    </div>
                  </button>
                  
                  {/* Follow Star Button - Centered with profile photo */}
                  {currentUserId && currentUserId !== streamer.profile_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollow();
                      }}
                      disabled={isFollowLoading}
                      className="transition-all hover:scale-110 self-center"
                      title={isFollowing ? 'Unfollow' : 'Follow'}
                    >
                      <Star 
                        className={`w-5 h-5 transition-all ${
                          isFollowing 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-yellow-400 hover:fill-yellow-400'
                        }`}
                      />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Mobile action buttons */}
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
                
                {/* Report button only - Follow button moved to bottom action bar */}
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
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  className={`
                    w-full h-full object-cover
                    lg:max-w-full lg:max-h-full lg:object-contain
                    ${isPortraitVideo ? 'lg:h-full lg:w-auto' : 'lg:w-full lg:h-auto'}
                  `}
                />
                <audio ref={audioRef} autoPlay playsInline muted={isMuted} />
              </>
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

            {/* Stream Ended Overlay */}
            {streamEnded && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center z-50">
                <div className="text-white text-center px-6 py-8 max-w-md">
                  {/* Icon */}
                  <div className="text-7xl mb-6 animate-bounce">
                    📺
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
                    Stream Has Ended
                  </h2>
                  
                  {/* Subtitle */}
                  <p className="text-gray-300 text-lg mb-2">
                    <span className="font-semibold text-white">{streamer.display_name || streamer.username}</span> is no longer live
                  </p>
                  
                  {/* Countdown */}
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold mb-3 animate-pulse">
                      {countdown}
                    </div>
                    <p className="text-gray-400 text-sm">
                      Returning to LiveTV...
                    </p>
                  </div>
                  
                  {/* Action Button */}
                  <button
                    onClick={() => router.push('/liveTV')}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Return to LiveTV Now
                  </button>
                  
                  {/* Secondary Actions */}
                  <div className="mt-4 flex gap-3 justify-center">
                    <button
                      onClick={() => router.push(`/profile/${streamer.username}`)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-all duration-200"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => router.push('/liveTV')}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-all duration-200"
                    >
                      Browse Streams
                    </button>
                  </div>
                </div>
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

        </div>

        {/* Right: Chat Panel - All screen sizes: overlay at bottom, no header/border */}
        <div className={`
          transition-all duration-300
          fixed
          ${isChatOpen ? 'block' : 'hidden'}
          bottom-0 left-0 right-0
          w-full
          h-[40vh]
          bg-transparent
          backdrop-blur-none
          border-0
          z-20
          pb-0
        `}>
          <div className="h-full flex flex-col mobile-safe-bottom min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
              {streamer.live_stream_id ? (
                <StreamChat 
                  liveStreamId={streamer.live_stream_id} 
                  onGiftClick={() => setShowGiftModal(true)}
                  onShareClick={handleShare}
                  onSettingsClick={() => setShowChatSettings(true)}
                  onRequestGuestClick={() => {
                    // TODO: Implement guest request functionality
                    alert('Guest request feature coming soon! This will send a request to the host to join as a guest.');
                  }}
                  showRequestGuestButton={currentUserId !== null && currentUserId !== streamer.profile_id}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white/60">
                  <p>Stream is offline</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
