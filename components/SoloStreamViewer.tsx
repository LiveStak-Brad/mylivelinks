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
  Star,
  Heart
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
import RequestGuestModal from './RequestGuestModal';
import GuestVideoOverlay from './GuestVideoOverlay';
import { useIM } from '@/components/im';
import { useLiveLike, useLiveViewTracking } from '@/lib/trending-hooks';
import { useStreamTopGifters } from '@/hooks/useStreamTopGifters';
import { useIsMobileWeb } from '@/hooks/useIsMobileWeb';

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

interface LeaderboardRank {
  current_rank: number;
  total_entries: number;
  metric_value: number;
  rank_tier: string | null;
  points_to_next_rank: number;
  next_rank: number;
}

function computeRankFromLeaderboardRows(profileId: string, rows: any[]): LeaderboardRank {
  const list = Array.isArray(rows) ? rows : [];
  const mapped = list
    .map((r: any) => ({
      profile_id: String(r?.profile_id ?? ''),
      rank: Number(r?.rank ?? 0),
      metric_value: Number(r?.metric_value ?? 0),
    }))
    .filter((r) => r.profile_id && r.rank > 0)
    .sort((a, b) => a.rank - b.rank);

  const total_entries = mapped.length;
  // If nobody has scored today yet, still show the live streamer as #1 (0 diamonds).
  if (total_entries === 0) {
    return {
      current_rank: 1,
      total_entries: 0,
      metric_value: 0,
      rank_tier: 'Diamond',
      points_to_next_rank: 0,
      next_rank: 2,
    };
  }
  const meIdx = mapped.findIndex((r) => r.profile_id === profileId);
  if (meIdx < 0) {
    return {
      current_rank: 0,
      total_entries,
      metric_value: 0,
      rank_tier: null,
      points_to_next_rank: 0,
      next_rank: 0,
    };
  }

  const me = mapped[meIdx];
  const above = me.rank > 1 ? mapped.find((r) => r.rank === me.rank - 1) : null;
  const rank2 = me.rank === 1 ? mapped.find((r) => r.rank === 2) : null;

  if (me.rank === 1) {
    const lead = Math.max(0, Number(me.metric_value ?? 0) - Number(rank2?.metric_value ?? 0));
    return {
      current_rank: 1,
      total_entries,
      metric_value: Number(me.metric_value ?? 0),
      rank_tier: 'Diamond',
      points_to_next_rank: lead,
      next_rank: 2,
    };
  }

  const points = Math.max(1, Number(above?.metric_value ?? 0) - Number(me.metric_value ?? 0) + 1);
  return {
    current_rank: me.rank,
    total_entries,
    metric_value: Number(me.metric_value ?? 0),
    rank_tier: null,
    points_to_next_rank: points,
    next_rank: Math.max(1, me.rank - 1),
  };
}

export default function SoloStreamViewer({ username }: SoloStreamViewerProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  const { openChat: openIM } = useIM();
  const isMobileWeb = useIsMobileWeb();

  // Per-tab identifier used to detect duplicate heartbeat/connect loops in logs.
  const viewerSessionIdRef = useRef<string>(
    (globalThis.crypto as any)?.randomUUID?.() ?? `vs_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  );
  
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
  const [showRequestGuest, setShowRequestGuest] = useState(false);
  const [recommendedStreams, setRecommendedStreams] = useState<RecommendedStream[]>([]);
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  
  // Guest publishing state
  const [isAcceptedGuest, setIsAcceptedGuest] = useState(false);
  const [isPublishingAsGuest, setIsPublishingAsGuest] = useState(false);
  const [guestStatus, setGuestStatus] = useState<string>(''); // Visual feedback for debugging
  const guestRequestIdRef = useRef<number | null>(null);
  const [streamEnded, setStreamEnded] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [leaderboardRank, setLeaderboardRank] = useState<LeaderboardRank | null>(null);
  const [trendingRank, setTrendingRank] = useState<number | null>(null);
 
  // Stream-scoped Top Gifters (polling; safe for launch)
  const { gifters: streamTopGifters } = useStreamTopGifters({
    liveStreamId: streamer?.live_stream_id ?? null,
    enabled: !!(streamer?.live_stream_id && streamer?.live_available),
    pollIntervalMs: 7000,
    limit: 20,
  });
  
  // Like system for trending
  const { isLiked, likesCount, toggleLike, isLoading: isLikeLoading } = useLiveLike({
    streamId: streamer?.live_stream_id || null,
    profileId: currentUserId || undefined,
    enabled: !!currentUserId && !!streamer?.live_stream_id && streamer?.live_available
  });

  // Fidget like counter (visual only, increments on every tap)
  const [fidgetLikeCount, setFidgetLikeCount] = useState(0);
  const [showLikePop, setShowLikePop] = useState(false);

  // Reset fidget counter when stream changes
  useEffect(() => {
    setFidgetLikeCount(0);
  }, [streamer?.live_stream_id]);

  // View tracking for trending
  useLiveViewTracking({
    streamId: streamer?.live_stream_id || null,
    profileId: currentUserId || undefined,
    enabled: !!streamer?.live_stream_id && streamer?.live_available && currentUserId !== streamer?.profile_id
  });
  
  // LiveKit room connection - SINGLE connection per mount
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isConnectingRef = useRef(false); // Guard against duplicate connects
  const connectedUsernameRef = useRef<string | null>(null); // Track who we're connected to
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);
  const wasHiddenRef = useRef(false);
  const disconnectedDueToVisibilityRef = useRef(false);

  const extractUserId = useCallback((identity: string): string => {
    if (identity.startsWith('u_')) {
      const parts = identity.split(':');
      if (parts.length >= 1) {
        return parts[0].substring(2);
      }
    }
    return identity;
  }, []);

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

  const disconnectRoom = useCallback(
    async (
      reason: string,
      options: { markVisibilityDisconnect?: boolean; preserveConnectedUsername?: boolean } = {}
    ) => {
      const { markVisibilityDisconnect = false, preserveConnectedUsername = false } = options;
      if (markVisibilityDisconnect) {
        disconnectedDueToVisibilityRef.current = true;
      }
      const existingRoom = roomRef.current;
      if (!existingRoom) return;

      if (DEBUG_LIVEKIT) {
        console.log('[SoloStreamViewer] Disconnecting room', { reason });
      }

      roomRef.current = null;
      try {
        await existingRoom.disconnect();
      } catch (err) {
        console.error('[SoloStreamViewer] Error disconnecting room:', err);
      } finally {
        setIsRoomConnected(false);
        isConnectingRef.current = false;
        if (!preserveConnectedUsername) {
          connectedUsernameRef.current = null;
        }
      }
    },
    [setIsRoomConnected]
  );

  // NOTE (P0 stability): Solo Viewer previously ran TWO heartbeat mechanisms:
  // 1) client-side supabase.rpc('update_viewer_heartbeat') via useViewerHeartbeat
  // 2) service-role POST /api/active-viewers/heartbeat
  // We keep ONLY the service-role heartbeat to avoid duplicate work + timing jank.

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
        if (DEBUG_LIVEKIT) {
          console.log('[SoloStreamViewer][HEARTBEAT] ping_start', {
            viewerSessionId: viewerSessionIdRef.current,
            live_stream_id: streamer.live_stream_id,
            viewer_id: currentUserId,
            is_active,
          });
        }
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
        if (DEBUG_LIVEKIT) {
          console.log('[SoloStreamViewer][HEARTBEAT] ping_done', {
            viewerSessionId: viewerSessionIdRef.current,
            live_stream_id: streamer.live_stream_id,
            viewer_id: currentUserId,
            is_active,
          });
        }
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

        // Prefer the ACTIVE solo stream (live_available=true). If none, fall back to most recent.
        const { data: activeStream } = await supabase
          .from('live_streams')
          .select('id, live_available, started_at')
          .eq('profile_id', profile.id)
          .eq('streaming_mode', 'solo')
          .eq('live_available', true)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: latestStream } = activeStream
          ? ({ data: null } as any)
          : await supabase
              .from('live_streams')
              .select('id, live_available, started_at')
              .eq('profile_id', profile.id)
              .eq('streaming_mode', 'solo')
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle();

        const liveStream = activeStream ?? latestStream ?? null;

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

        // Top gifters are stream-scoped and loaded via `useStreamTopGifters` (polling).

        // Check follow status if user is logged in
        if (currentUserId && currentUserId !== profile.id) {
          const { data: followData, error: followErr } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('following_id', profile.id)
            .maybeSingle();

          if (followErr) {
            console.warn('[SoloStreamViewer] Follow status lookup failed:', followErr);
          }

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

  // ============================================================================
  // P0 FIX: Stream restart detection
  // Subscribe to new live_streams by the same host profile
  // When host restarts stream (new live_stream_id), auto-update viewer state
  // ============================================================================
  useEffect(() => {
    if (!streamer?.profile_id) return;

    const hostProfileId = streamer.profile_id;
    const currentStreamId = streamer.live_stream_id;
    
    console.log('[SoloStreamViewer] 🔄 Setting up stream restart detection for host:', hostProfileId, 'current stream:', currentStreamId);

    const streamChannel = supabase
      .channel(`live-streams-host-${hostProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_streams',
          filter: `profile_id=eq.${hostProfileId}`,
        },
        (payload) => {
          const newStream = payload.new as any;
          console.log('[SoloStreamViewer] 🆕 New stream detected:', newStream);
          
          // Only switch if it's a live solo stream and different from current
          if (
            newStream.streaming_mode === 'solo' &&
            newStream.live_available === true &&
            newStream.id !== currentStreamId
          ) {
            console.log('[SoloStreamViewer] ✅ Switching to new stream:', newStream.id);
            setStreamer(prev => prev ? {
              ...prev,
              live_stream_id: newStream.id,
              live_available: true,
              id: newStream.id.toString(),
            } : prev);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `profile_id=eq.${hostProfileId}`,
        },
        (payload) => {
          const updatedStream = payload.new as any;
          
          // If current stream goes offline, check for a new active stream
          if (updatedStream.id === currentStreamId && updatedStream.live_available === false) {
            console.log('[SoloStreamViewer] ⚠️ Current stream ended, checking for new active stream...');
            
            // Small delay to allow new stream to be created
            setTimeout(async () => {
              const { data: newActiveStream } = await supabase
                .from('live_streams')
                .select('id, live_available, streaming_mode')
                .eq('profile_id', hostProfileId)
                .eq('streaming_mode', 'solo')
                .eq('live_available', true)
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (newActiveStream && newActiveStream.id !== currentStreamId) {
                console.log('[SoloStreamViewer] ✅ Found new active stream:', newActiveStream.id);
                setStreamer(prev => prev ? {
                  ...prev,
                  live_stream_id: newActiveStream.id,
                  live_available: true,
                  id: newActiveStream.id.toString(),
                } : prev);
              } else {
                // No new stream, just mark current as offline
                setStreamer(prev => prev ? {
                  ...prev,
                  live_available: false,
                } : prev);
              }
            }, 500);
          }
          
          // If a different stream becomes live, switch to it
          if (
            updatedStream.id !== currentStreamId &&
            updatedStream.streaming_mode === 'solo' &&
            updatedStream.live_available === true
          ) {
            console.log('[SoloStreamViewer] ✅ Different stream went live, switching:', updatedStream.id);
            setStreamer(prev => prev ? {
              ...prev,
              live_stream_id: updatedStream.id,
              live_available: true,
              id: updatedStream.id.toString(),
            } : prev);
          }
        }
      )
      .subscribe((status) => {
        console.log('[SoloStreamViewer] Stream restart subscription status:', status);
      });

    return () => {
      console.log('[SoloStreamViewer] 🔄 Cleaning up stream restart subscription');
      streamChannel.unsubscribe();
    };
  }, [streamer?.profile_id, streamer?.live_stream_id, supabase]);
 
  // Bind Top 3 gifter bubbles to the same aggregated source used by the modal
  useEffect(() => {
    const top3: TopGifter[] = (streamTopGifters ?? [])
      .slice(0, 3)
      .map((g) => ({
        profile_id: g.profile_id,
        username: g.username,
        avatar_url: g.avatar_url ?? undefined,
        total_coins: g.total_coins,
      }));
    setTopGifters(top3);
  }, [streamTopGifters]);

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
          await disconnectRoom('switch_streamer', { preserveConnectedUsername: true });
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
          
          // IMPORTANT: Skip guest participants - they go to GuestVideoOverlay
          const isGuest = participant.identity.startsWith('guest_');
          if (isGuest) {
            console.log('[SoloStreamViewer] 🚫 Skipping GUEST participant tracks:', participant.identity);
            return;
          }
          
          participant.trackPublications.forEach((publication) => {
            console.log('[SoloStreamViewer] 📹 Found existing track publication:', {
              kind: publication.kind,
              source: publication.source,
              subscribed: publication.isSubscribed,
              track: publication.track,
            });
            
            if (publication.track && publication.kind === Track.Kind.Video && videoRef.current) {
              console.log('[SoloStreamViewer] 🎥 Attaching EXISTING HOST video track to video element');
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
              const participantUserId = extractUserId(participant.identity);
              const isSelfAudio = !!currentUserId && participantUserId === currentUserId;
              if (isSelfAudio) {
                console.log('[SoloStreamViewer] 🔇 Skipping self audio track');
                try {
                  publication.track.detach();
                } catch {
                  // ignore
                }
              } else {
                console.log('[SoloStreamViewer] 🔊 Attaching EXISTING audio track to audio element');
                publication.track.attach(audioRef.current);
              }
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

          // IMPORTANT: Skip guest tracks - they go to GuestVideoOverlay, not main player
          const isGuestTrack = participant.identity.startsWith('guest_');
          if (isGuestTrack) {
            console.log('[SoloStreamViewer] 🚫 Skipping GUEST track (handled by GuestVideoOverlay):', participant.identity);
            return;
          }

          if (DEBUG_LIVEKIT) {
            console.log('[SoloStreamViewer] Track subscribed:', {
              kind: track.kind,
              participant: participant.identity,
              source: (publication as any)?.source,
            });
          }

          // Attach video + audio tracks (HOST only, not guests)
          if (track.kind === Track.Kind.Video && videoRef.current) {
            console.log('[SoloStreamViewer] 🎥 Attaching HOST VIDEO track to video element');
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
            const participantUserId = extractUserId(participant.identity);
            const isSelfAudio = !!currentUserId && participantUserId === currentUserId;
            if (isSelfAudio) {
              console.log('[SoloStreamViewer] 🔇 Skipping self audio track');
              try {
                track.detach();
              } catch {
                // ignore
              }
            } else {
              console.log('[SoloStreamViewer] 🔊 Attaching AUDIO track to audio element');
              track.attach(audioRef.current);
            }
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
          connectedUsernameRef.current = null;
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
      void disconnectRoom('effect_cleanup');
    };
  }, [disconnectRoom, resumePlayback, streamer?.live_available, streamer?.profile_id, streamer?.username, currentUserId, extractUserId]); // STABLE DEPS: only reconnect if these change

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHiddenRef.current = true;
        void disconnectRoom('visibility_hidden', { markVisibilityDisconnect: true });
        return;
      }

      if (wasHiddenRef.current && disconnectedDueToVisibilityRef.current) {
        wasHiddenRef.current = false;
        disconnectedDueToVisibilityRef.current = false;
        const targetUsername = streamer?.username || username;
        if (targetUsername) {
          router.replace(`/live/${encodeURIComponent(targetUsername)}`);
        } else {
          router.replace('/liveTV');
        }
      }
    };

    const handlePageHide = () => {
      void disconnectRoom('pagehide');
    };

    const handleBeforeUnload = () => {
      try {
        roomRef.current?.disconnect();
      } catch {
        // ignore
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [disconnectRoom, router, streamer?.username, username]);

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
    }, 5000); // Increased from 2s to 5s - video events handle most cases

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
              void disconnectRoom('stream_end');
            }
          }
        }
      )
      .subscribe();

    return () => {
      streamChannel.unsubscribe();
    };
  }, [streamer?.live_stream_id, supabase]);

  // P0 FIX: Subscribe to host starting a NEW stream (new live_stream_id)
  // This handles the case where host restarts stream and viewers need to update
  useEffect(() => {
    if (!streamer?.profile_id) return;

    console.log('[SoloStreamViewer] Setting up stream restart detection for profile:', streamer.profile_id);

    const newStreamChannel = supabase
      .channel(`host-new-stream:${streamer.profile_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_streams',
          filter: `profile_id=eq.${streamer.profile_id}`,
        },
        (payload: any) => {
          const newStream = payload.new as any;
          
          // Only update if this is a new ACTIVE solo stream
          if (newStream.live_available === true && newStream.streaming_mode === 'solo') {
            console.log('[SoloStreamViewer] 🔄 Host started NEW stream! Updating live_stream_id:', newStream.id);
            
            // Clear stream ended state if it was set
            setStreamEnded(false);
            
            // Update streamer state with new live_stream_id
            setStreamer(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                live_stream_id: newStream.id,
                live_available: true,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      newStreamChannel.unsubscribe();
    };
  }, [streamer?.profile_id, supabase]);

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

  // ============================================================================
  // GUEST PUBLISHING: Monitor guest status and start publishing when accepted
  // ============================================================================
  useEffect(() => {
    console.log('[SoloStreamViewer] Guest effect check:', { 
      liveStreamId: streamer?.live_stream_id, 
      currentUserId, 
      hostId: streamer?.profile_id,
      isHost: currentUserId === streamer?.profile_id
    });
    
    if (!streamer?.live_stream_id || !currentUserId || currentUserId === streamer.profile_id) {
      console.log('[SoloStreamViewer] Guest effect skipped - missing data or is host');
      return;
    }

    // Subscribe to guest request status changes for this user
    const guestChannel = supabase
      .channel(`guest-status-${currentUserId}-${streamer.live_stream_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_requests',
          filter: `requester_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const record = (payload.new || payload.old) as any;
          if (!record || record.live_stream_id !== streamer.live_stream_id) return;

          console.log('[SoloStreamViewer] Guest status update:', payload.eventType, record.status);

          if (payload.eventType === 'UPDATE' && record.status === 'accepted') {
            setGuestStatus('You were accepted!');
            setIsAcceptedGuest(true);
            guestRequestIdRef.current = record.id;
            
            // Start publishing as guest
            await startGuestPublishing();
          } else if (payload.eventType === 'DELETE' || record.status === 'cancelled' || record.status === 'declined') {
            // Guest session ended
            setIsAcceptedGuest(false);
            guestRequestIdRef.current = null;
            await stopGuestPublishing();
          }
        }
      )
      .subscribe();

    // Check if already an accepted guest on load
    const checkExistingGuest = async () => {
      console.log('[SoloStreamViewer] Checking for existing accepted guest request...');
      const { data, error } = await supabase
        .from('guest_requests')
        .select('id, status')
        .eq('live_stream_id', streamer.live_stream_id)
        .eq('requester_id', currentUserId)
        .eq('status', 'accepted')
        .maybeSingle();

      console.log('[SoloStreamViewer] Existing guest check result:', { data, error });

      if (data) {
        console.log('[SoloStreamViewer] Already accepted as guest, starting publishing');
        setGuestStatus('Accepted! Starting...');
        setIsAcceptedGuest(true);
        guestRequestIdRef.current = data.id;
        await startGuestPublishing();
      } else {
        console.log('[SoloStreamViewer] Not currently an accepted guest');
      }
    };

    checkExistingGuest();

    return () => {
      guestChannel.unsubscribe();
    };
  }, [streamer?.live_stream_id, streamer?.profile_id, currentUserId, supabase]);

  // Start publishing camera/mic as guest
  const startGuestPublishing = useCallback(async () => {
    console.log('[SoloStreamViewer] startGuestPublishing called', { 
      hasRoom: !!roomRef.current, 
      isPublishingAsGuest,
      streamerUsername: streamer?.username,
      currentUserId 
    });
    
    setGuestStatus('Starting guest mode...');
    
    if (isPublishingAsGuest) {
      console.log('[SoloStreamViewer] Already publishing as guest, skipping');
      setGuestStatus('Already publishing');
      return;
    }

    try {
      console.log('[SoloStreamViewer] Getting guest token...');
      setGuestStatus('Getting token...');
      
      // Get a new token with canPublish: true
      // Use LIVEKIT_ROOM_NAME (live_central) - same room everyone connects to
      const tokenRes = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roomName: LIVEKIT_ROOM_NAME,  // Must use the same room everyone is in
          participantName: `guest_${currentUserId}`,
          canPublish: true,  // GUEST MODE - can publish
          canSubscribe: true,
          deviceType: 'web',
          role: 'guest',
        }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error('[SoloStreamViewer] Failed to get guest token:', tokenRes.status, errorText);
        setGuestStatus(`Token error: ${tokenRes.status}`);
        return;
      }

      const { token, url } = await tokenRes.json();
      console.log('[SoloStreamViewer] Got guest token');
      setGuestStatus('Enabling camera...');

      // Get existing room - DON'T disconnect, we need to keep watching the host!
      let room = roomRef.current;
      
      if (!room || room.state !== 'connected') {
        // If no room connection, create one
        console.log('[SoloStreamViewer] No existing room, creating new connection...');
        const { Room } = await import('livekit-client');
        room = new Room();
        roomRef.current = room;
        await room.connect(url, token);
      } else {
        // Room exists and is connected - we need to reconnect with new permissions
        // But we must preserve the subscription to the host's tracks
        console.log('[SoloStreamViewer] Room exists, reconnecting with guest permissions...');
        
        // Store current subscriptions
        const hostParticipants = Array.from(room.remoteParticipants.values());
        console.log('[SoloStreamViewer] Current participants:', hostParticipants.map(p => p.identity));
        
        // Disconnect and reconnect with new token
        await room.disconnect();
        await room.connect(url, token);
        
        console.log('[SoloStreamViewer] Reconnected, waiting for tracks to resubscribe...');
        
        // Wait a moment for tracks to be available, then re-attach host video (NOT guest tracks)
        setTimeout(() => {
          if (room && videoRef.current && audioRef.current) {
            room.remoteParticipants.forEach((participant) => {
              // Skip guest participants - they go to GuestVideoOverlay
              if (participant.identity.startsWith('guest_')) {
                console.log('[SoloStreamViewer] Skipping guest for reattach:', participant.identity);
                return;
              }
              
              console.log('[SoloStreamViewer] Reattaching HOST participant:', participant.identity);
              participant.trackPublications.forEach((pub) => {
                if (pub.track) {
                  if (pub.kind === 'video') {
                    console.log('[SoloStreamViewer] Reattaching HOST video track');
                    pub.track.attach(videoRef.current!);
                  } else if (pub.kind === 'audio') {
                    console.log('[SoloStreamViewer] Reattaching HOST audio track');
                    pub.track.attach(audioRef.current!);
                  }
                }
              });
            });
          }
        }, 1000);
      }
      
      console.log('[SoloStreamViewer] Connected! Enabling camera and mic...');

      // Enable camera and microphone
      try {
        await room.localParticipant.setCameraEnabled(true);
        console.log('[SoloStreamViewer] Camera enabled');
        setGuestStatus('Camera on! Enabling mic...');
      } catch (camErr) {
        console.error('[SoloStreamViewer] Failed to enable camera:', camErr);
        setGuestStatus(`Camera error: ${camErr}`);
      }
      
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('[SoloStreamViewer] Microphone enabled');
      } catch (micErr) {
        console.error('[SoloStreamViewer] Failed to enable microphone:', micErr);
      }

      setIsPublishingAsGuest(true);
      setGuestStatus('🎥 LIVE AS GUEST!');
      console.log('[SoloStreamViewer] Guest publishing started successfully!');
    } catch (err) {
      console.error('[SoloStreamViewer] Error starting guest publishing:', err);
      setGuestStatus(`Error: ${err}`);
    }
  }, [isPublishingAsGuest, streamer?.username, username, currentUserId]);

  // Stop publishing as guest
  const stopGuestPublishing = useCallback(async () => {
    if (!roomRef.current || !isPublishingAsGuest) return;

    try {
      console.log('[SoloStreamViewer] Stopping guest publishing...');
      const room = roomRef.current;

      // Disable camera and microphone
      await room.localParticipant.setCameraEnabled(false);
      await room.localParticipant.setMicrophoneEnabled(false);

      // Unpublish all tracks
      room.localParticipant.trackPublications.forEach((pub) => {
        if (pub.track) {
          room.localParticipant.unpublishTrack(pub.track);
        }
      });

      setIsPublishingAsGuest(false);
      setIsAcceptedGuest(false);
      console.log('[SoloStreamViewer] Guest publishing stopped');
    } catch (err) {
      console.error('[SoloStreamViewer] Error stopping guest publishing:', err);
    }
  }, [isPublishingAsGuest]);

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

  // Load leaderboard rank for streamer
  useEffect(() => {
    const loadLeaderboardRank = async () => {
      if (!streamer?.profile_id) return;

      try {
        // Canonical source: get_leaderboard (same as LeaderboardModal)
        const { data, error } = await supabase.rpc('get_leaderboard', {
          p_type: 'top_streamers',
          p_period: 'daily',
          p_limit: 100,
          p_room_id: null,
        });

        if (error) {
          console.error('[SoloStreamViewer] Error fetching leaderboard rows:', error);
          return;
        }

        const rank = computeRankFromLeaderboardRows(streamer.profile_id, Array.isArray(data) ? data : []);
        setLeaderboardRank(rank);
      } catch (err) {
        console.error('[SoloStreamViewer] Error loading leaderboard rank:', err);
      }
    };

    const loadTrendingRank = async () => {
      if (!streamer?.live_stream_id) return;

      try {
        // Fetch trending streams and find this stream's rank
        const { data, error } = await supabase
          .rpc('rpc_get_trending_live_streams', {
            p_limit: 100,
            p_offset: 0
          });

        if (error) {
          console.error('[SoloStreamViewer] Error fetching trending rank:', error);
          return;
        }

        if (data && Array.isArray(data)) {
          const rank = data.findIndex((s: any) => s.stream_id === streamer.live_stream_id);
          if (rank !== -1) {
            setTrendingRank(rank + 1); // 1-indexed
          } else {
            // Show 0 instead of a dash when live but not ranked
            setTrendingRank(0);
          }
        }
      } catch (err) {
        console.error('[SoloStreamViewer] Error loading trending rank:', err);
      }
    };

    loadLeaderboardRank();
    loadTrendingRank();
    
    // Refresh rank every 60 seconds (fallback-only, ranks don't need real-time accuracy)
    const interval = setInterval(() => {
      loadLeaderboardRank();
      loadTrendingRank();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [streamer?.profile_id, streamer?.live_stream_id, streamer?.live_available, supabase]);

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

  // Mobile container class for full-bleed layout on phone widths
  const containerClass = isMobileWeb
    ? 'mobile-live-container mobile-live-v3'
    : 'min-h-screen bg-black overflow-hidden';

  return (
    <div className={containerClass}>
      
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
            
            {/* Viewers count - Top center on desktop, closer to right on mobile (with safe area support on mobile) */}
            <div className="absolute z-50 lg:top-4 lg:left-1/2 lg:-translate-x-1/2 left-[65%] -translate-x-1/2" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
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
                <div className="md:hidden absolute left-2 top-24 flex flex-col gap-px z-30">
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
                
                {/* Streamer Info with hanging rank badge */}
                <div className="relative flex flex-col">
                  {/* Main profile bubble */}
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
                        {/* Trending/Leaderboard buttons row */}
                        <div className="flex items-center gap-2 text-xs text-white/80">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTrending(true);
                            }}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="font-semibold text-sm">{trendingRank ?? 0}</span>
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
                            <span className="font-semibold text-sm">
                              {leaderboardRank?.current_rank ?? 0}
                            </span>
                          </button>
                        </div>
                      </div>
                    </button>
                    
                    {/* Follow Star Button */}
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

                  {/* Rank badge hanging BELOW the bubble - ABSOLUTE positioned */}
                  {leaderboardRank && leaderboardRank.current_rank > 0 && leaderboardRank.current_rank <= 100 && (
                    <div className="absolute top-full left-2 mt-1 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-500/90 to-orange-500/90 border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/30 backdrop-blur-md w-fit z-10">
                      <span className={`text-[13px] font-bold ${
                        leaderboardRank.current_rank === 1 
                          ? 'text-white' 
                          : leaderboardRank.current_rank === 2
                          ? 'text-gray-100'
                          : leaderboardRank.current_rank === 3
                          ? 'text-orange-100'
                          : leaderboardRank.current_rank <= 10
                          ? 'text-purple-100'
                          : 'text-blue-100'
                      }`}>
                        {leaderboardRank.current_rank}<sup className="text-[8px]">{leaderboardRank.current_rank === 1 ? 'st' : leaderboardRank.current_rank === 2 ? 'nd' : leaderboardRank.current_rank === 3 ? 'rd' : 'th'}</sup>
                      </span>
                      {leaderboardRank.current_rank === 1 && leaderboardRank.points_to_next_rank >= 0 && (
                        <>
                          <span className="text-white/60 text-[10px]">•</span>
                          <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                          <span className="text-white/60 text-[10px]">•</span>
                          <span className="text-[10px] text-white/90 font-medium">+{leaderboardRank.points_to_next_rank.toLocaleString()}</span>
                        </>
                      )}
                      {leaderboardRank.current_rank > 1 && leaderboardRank.points_to_next_rank >= 1 && (
                        <>
                          <span className="text-white/60 text-[10px]">•</span>
                        <div className="flex items-center gap-0.5">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L4 7L2 14L12 22L22 14L20 7L12 2Z" fill="currentColor" className="text-cyan-400"/>
                            <path d="M12 2L20 7L12 12L4 7L12 2Z" fill="currentColor" className="text-cyan-200" opacity="0.8"/>
                          </svg>
                          <span className="text-[10px] text-white/90 font-medium">
                            {leaderboardRank.points_to_next_rank.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-white/90 font-medium">→</span>
                          <span className="text-[10px] text-white/90 font-medium">{leaderboardRank.next_rank}<sup className="text-[6px]">{leaderboardRank.next_rank === 1 ? 'st' : leaderboardRank.next_rank === 2 ? 'nd' : leaderboardRank.next_rank === 3 ? 'rd' : 'th'}</sup></span>
                        </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {leaderboardRank && leaderboardRank.current_rank > 100 && (
                    <div className="absolute top-full left-2 mt-1 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-gray-600/90 to-gray-700/90 border-2 border-gray-500/50 shadow-lg backdrop-blur-md w-fit z-10">
                    <div className="flex items-center gap-0.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L4 7L2 14L12 22L22 14L20 7L12 2Z" fill="currentColor" className="text-cyan-400"/>
                        <path d="M12 2L20 7L12 12L4 7L12 2Z" fill="currentColor" className="text-cyan-200" opacity="0.8"/>
                      </svg>
                      <span className="text-[10px] text-white/80 font-medium">
                        {leaderboardRank.points_to_next_rank.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-white/80 font-medium">→ Top 100</span>
                    </div>
                    </div>
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

            {/* Guest Video Overlay - Floating boxes for up to 2 guests */}
            <GuestVideoOverlay
              liveStreamId={streamer.live_stream_id}
              hostId={streamer.profile_id}
              currentUserId={currentUserId || undefined}
              isHost={false}
              room={roomRef.current}
              onGuestLeave={() => {
                // Stop publishing if guest was publishing
                if (roomRef.current?.localParticipant) {
                  roomRef.current.localParticipant.trackPublications.forEach((pub) => {
                    if (pub.track) {
                      roomRef.current?.localParticipant.unpublishTrack(pub.track);
                    }
                  });
                }
                console.log('[SoloStreamViewer] Guest left, stopped publishing');
              }}
            />
          </div>

        </div>

        {/* Right: Chat Panel - All screen sizes: overlay at bottom, no header/border */}
        {/* CRITICAL: position: fixed ensures chat overlays video and doesn't push it when keyboard opens */}
        <div className={`
          transition-all duration-300
          fixed
          ${isChatOpen ? 'flex flex-col' : 'hidden'}
          bottom-0 left-0 right-0
          w-full
          h-[40vh]
          bg-transparent
          backdrop-blur-none
          border-0
          z-20
          pb-0
        `}>
          {/* Like Button - Top Right of Chat */}
          {currentUserId && streamer?.live_stream_id && (
            <button
              onClick={() => {
                if (!isLikeLoading) {
                  // First tap: count for trending (DB)
                  if (!isLiked) {
                    toggleLike();
                  }
                  // Every tap: increment fidget counter (visual only)
                  setFidgetLikeCount(prev => prev + 1);
                  setShowLikePop(true);
                  setTimeout(() => setShowLikePop(false), 300);
                }
              }}
              disabled={isLikeLoading}
              className={`
                absolute -top-16 right-4 z-30
                flex flex-col items-center gap-1
                transition-all
                ${showLikePop ? 'scale-110' : 'scale-100'}
              `}
            >
              <Heart 
                className={`w-10 h-10 drop-shadow-lg ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`}
                strokeWidth={2}
              />
              {(likesCount + fidgetLikeCount) > 0 && (
                <span className="text-white text-sm font-bold drop-shadow-lg">
                  {(likesCount + fidgetLikeCount) > 999 ? '999+' : (likesCount + fidgetLikeCount)}
                </span>
              )}
            </button>
          )}

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              {streamer.live_stream_id ? (
                <StreamChat 
                  liveStreamId={streamer.live_stream_id} 
                  onGiftClick={() => setShowGiftModal(true)}
                  onShareClick={handleShare}
                  onSettingsClick={() => setShowChatSettings(true)}
                  onRequestGuestClick={() => setShowRequestGuest(true)}
                  showRequestGuestButton={currentUserId !== null && currentUserId !== streamer.profile_id}
                  alwaysAutoScroll={true}
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

      {/* Request Guest Modal */}
      <RequestGuestModal
        isOpen={showRequestGuest}
        onClose={() => setShowRequestGuest(false)}
        streamerUsername={streamer.display_name || streamer.username}
        liveStreamId={streamer.live_stream_id}
        hostId={streamer.profile_id}
        currentUserId={currentUserId || undefined}
        onRequestSent={() => {
          console.log('[SoloStreamViewer] Guest request sent');
        }}
      />
    </div>
  );
}
