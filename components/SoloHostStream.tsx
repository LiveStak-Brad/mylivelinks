'use client';

/**
 * ⚠️ CRITICAL: DO NOT MODIFY LAYOUT OR ADD UI ELEMENTS WITHOUT EXPLICIT REQUEST ⚠️
 * 
 * This is the SOLO STREAM HOST component. The layout and UI are finalized.
 * DO NOT add buttons, overlays, or modify the layout structure without being explicitly asked.
 * All UI modifications must be approved first.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { DEBUG_LIVEKIT, TOKEN_ENDPOINT, canUserGoLiveSolo } from '@/lib/livekit-constants';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { GifterBadge as TierBadge } from '@/components/gifter';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';
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
import { ShareModal } from './ShareModal';
import HostStreamSettingsModal, { loadSavedDevices } from './HostStreamSettingsModal';
import CoHostInviteModal from './CoHostInviteModal';
import GuestRequestsModal from './GuestRequestsModal';
import StreamFiltersModal from './StreamFiltersModal';
import BattleInviteModal from './BattleInviteModal';
import GuestVideoOverlay from './GuestVideoOverlay';
import IncomingBattleRequestStack from './IncomingBattleRequestStack';
import BattleGridWrapper from './battle/BattleGridWrapper';
import CooldownSheet from './battle/CooldownSheet';
import { useBattleSession } from '@/hooks/useBattleSession';
import { joinBattlePool, endSession, startRematch } from '@/lib/battle-session';
import { useIM } from '@/components/im';
import { useLiveLike, useLiveViewTracking } from '@/lib/trending-hooks';
import { useStreamTopGifters } from '@/hooks/useStreamTopGifters';
import { useIsMobileWeb } from '@/hooks/useIsMobileWeb';
import { 
  useVideoFilterPipeline, 
  VideoFilterSettings, 
  DEFAULT_FILTER_SETTINGS, 
  loadFilterSettings,
  saveFilterSettings,
  areFiltersDefault 
} from '@/hooks/useVideoFilterPipeline';

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

interface LeaderboardRank {
  current_rank: number;
  total_entries: number;
  metric_value: number;
  rank_tier: string | null;
  points_to_next_rank: number;
  next_rank: number;
}

const EARLY_ACCESS_BANNER_STORAGE_KEY = 'mll_solo_host_early_access_banner_v2_dismissed';

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
  const isMobileWeb = useIsMobileWeb();
  
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
  const [showEarlyAccessBanner, setShowEarlyAccessBanner] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoHost, setShowCoHost] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const [showCooldown, setShowCooldown] = useState(false);
  const [leaderboardRank, setLeaderboardRank] = useState<LeaderboardRank | null>(null);
  const [trendingRank, setTrendingRank] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const dismissed = window.localStorage.getItem(EARLY_ACCESS_BANNER_STORAGE_KEY) === 'true';
      setShowEarlyAccessBanner(!dismissed);
    } catch (error) {
      console.warn('[SoloHostStream] Unable to read early access banner state:', error);
      setShowEarlyAccessBanner(true);
    }
  }, []);

  const handleDismissEarlyAccessBanner = useCallback(() => {
    setShowEarlyAccessBanner(false);

    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(EARLY_ACCESS_BANNER_STORAGE_KEY, 'true');
    } catch (error) {
      console.warn('[SoloHostStream] Unable to persist early access banner dismissal:', error);
    }
  }, []);

  // Battle/Cohost session state
  const {
    session: battleSession,
    pendingInvites,
    remainingSeconds: battleRemainingSeconds,
    isParticipant: isBattleParticipant,
    roomName: battleRoomName,
    acceptInvite,
    declineInvite,
    endCurrentSession,
    transitionToCooldown,
    triggerRematch,
    refresh: refreshBattleSession,
  } = useBattleSession({ profileId: currentUserId });
  
  // Clean up battle/cohost session when stream ends
  useEffect(() => {
    // If we have an active session but no live stream, end the session
    if (battleSession && !streamer?.live_stream_id) {
      console.log('[SoloHostStream] Stream ended - cleaning up battle/cohost session');
      endCurrentSession().catch(err => {
        console.error('[SoloHostStream] Failed to end session on stream end:', err);
      });
    }
  }, [battleSession, streamer?.live_stream_id, endCurrentSession]);
  
  // No longer need currentInvite state - stack handles all invites
  
  // Show cooldown sheet when battle enters cooldown
  useEffect(() => {
    if (battleSession?.status === 'cooldown') {
      setShowCooldown(true);
    } else {
      setShowCooldown(false);
    }
  }, [battleSession?.status]);

  // Handle invite declined
  const handleInviteDeclined = useCallback((inviteId: string) => {
    declineInvite(inviteId).catch(err => {
      console.error('[SoloHostStream] Decline invite error:', err);
    });
  }, [declineInvite]);
  
  // Check if we're in an active battle/cohost session (show grid instead of solo video)
  // Include ALL statuses where BattleGridWrapper should be shown
  const isInActiveSession = battleSession && (
    battleSession.status === 'active' || 
    battleSession.status === 'cooldown' ||
    battleSession.status === 'battle_ready' ||
    battleSession.status === 'battle_active'
  );
  
  // When entering a battle, unpublish from solo room to free camera for battle room
  // When exiting a battle, show a message that they can resume or auto-resume
  const prevIsInActiveSessionRef = useRef(false);
  const wasPublishingBeforeSessionRef = useRef(false);
  const resetConnectionRef = useRef<(() => Promise<void>) | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  
  useEffect(() => {
    const wasInSession = prevIsInActiveSessionRef.current;
    const isNowInSession = !!isInActiveSession;
    prevIsInActiveSessionRef.current = isNowInSession;
    
    if (!wasInSession && isNowInSession && roomRef.current && isPublishing) {
      // Entering a battle - unpublish local tracks from solo room
      console.log('[SoloHostStream] Entering battle - unpublishing from solo room');
      wasPublishingBeforeSessionRef.current = true;
      const room = roomRef.current;
      room.localParticipant.trackPublications.forEach((pub) => {
        if (pub.track) {
          room.localParticipant.unpublishTrack(pub.track);
        }
      });
      // Mark that we were publishing before battle
      setShowResumePrompt(false);
    }
    
    if (wasInSession && !isNowInSession) {
      // Exiting battle/cohost session - restore solo publishing if we were live before
      console.log('[SoloHostStream] Exiting battle - restoring solo publishing');
      const shouldResume = wasPublishingBeforeSessionRef.current;
      wasPublishingBeforeSessionRef.current = false;

      if (shouldResume) {
        // Re-init and republish tracks into the SOLO room so viewers don't see black/profile-photo.
        // This uses the existing track reset logic (camera+mic re-publish + re-attach).
        resetConnectionRef.current?.()
          .then(() => {
            setShowResumePrompt(false);
          })
          .catch((err) => {
            console.error('[SoloHostStream] Failed to restore solo publishing:', err);
            setShowResumePrompt(true);
          });
      } else {
        setShowResumePrompt(true);
      }
    }
  }, [isInActiveSession, isPublishing]);
  
  // Get opponent info for cooldown sheet
  const battleOpponent = useMemo(() => {
    if (!battleSession || !currentUserId) return null;
    
    // Use participants array if available (new multi-host format)
    if (battleSession.participants && Array.isArray(battleSession.participants)) {
      const others = battleSession.participants.filter((p: any) => p.profile_id !== currentUserId);
      if (others.length > 0) {
        const opponent = others[0];
        return {
          id: opponent.profile_id,
          username: opponent.username,
          display_name: opponent.display_name,
          avatar_url: opponent.avatar_url,
        };
      }
      return null;
    }
    
    // Fallback to old host_a/host_b format
    const isHostA = battleSession.host_a?.id === currentUserId;
    return isHostA ? battleSession.host_b : battleSession.host_a;
  }, [battleSession, currentUserId]);
  
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
  const [viewerCount, setViewerCount] = useState<number>(0);
  
  // Active device tracking for live switching
  const [activeVideoDeviceId, setActiveVideoDeviceId] = useState<string | undefined>(undefined);
  const [activeAudioDeviceId, setActiveAudioDeviceId] = useState<string | undefined>(undefined);

  // Screen share state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareSupported] = useState(() => 
    typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getDisplayMedia' in navigator.mediaDevices
  );
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  // Filter pipeline state
  const [filterSettings, setFilterSettings] = useState<VideoFilterSettings>(DEFAULT_FILTER_SETTINGS);
  const filterPipeline = useVideoFilterPipeline({ maxWidth: 1280, maxHeight: 720, frameRate: 30 });
  const rawCameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Reset connection state
  const [isResetting, setIsResetting] = useState(false);
  const [guestOverlayKey, setGuestOverlayKey] = useState(0);
  const lastResetRef = useRef<number>(0);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Share guard - prevents stream disconnect when using Share button
  // Valid for 30 seconds after share is initiated
  const isShareActiveRef = useRef<boolean>(false);
  const shareStartTimeRef = useRef<number>(0);
  const SHARE_GUARD_TIMEOUT_MS = 30000; // 30 seconds

  // Check if share is currently active (within timeout window)
  const isShareGuardActive = useCallback(() => {
    if (!isShareActiveRef.current) return false;
    const elapsed = Date.now() - shareStartTimeRef.current;
    if (elapsed > SHARE_GUARD_TIMEOUT_MS) {
      // Share guard expired
      isShareActiveRef.current = false;
      return false;
    }
    return true;
  }, []);

  // Handle share button click - open share modal
  const handleShare = useCallback(() => {
    console.log('[SoloHostStream] Share initiated - enabling share guard');
    isShareActiveRef.current = true;
    shareStartTimeRef.current = Date.now();
    setShowShareModal(true);
  }, []);

  // Load saved devices and filters on mount
  useEffect(() => {
    const saved = loadSavedDevices();
    if (saved.videoDeviceId) {
      setActiveVideoDeviceId(saved.videoDeviceId);
      console.log('[SoloHostStream] Loaded saved video device:', saved.videoDeviceId);
    }
    if (saved.audioDeviceId) {
      setActiveAudioDeviceId(saved.audioDeviceId);
      console.log('[SoloHostStream] Loaded saved audio device:', saved.audioDeviceId);
    }
    
    // Load saved filter settings
    const savedFilters = loadFilterSettings();
    setFilterSettings(savedFilters);
    console.log('[SoloHostStream] Loaded saved filter settings:', savedFilters);
  }, []);

  // Apply CSS filter to video element when filterSettings change (for preview)
  useEffect(() => {
    if (videoRef.current && isPublishing) {
      const buildFilter = (s: VideoFilterSettings): string => {
        const filters: string[] = [];
        const totalBlur = s.blur + (s.smoothing * 0.35);
        if (totalBlur > 0) filters.push(`blur(${totalBlur}px)`);
        if (s.brightness !== 1) filters.push(`brightness(${s.brightness})`);
        if (s.contrast !== 1) filters.push(`contrast(${s.contrast})`);
        if (s.saturation !== 1) filters.push(`saturate(${s.saturation})`);
        return filters.length > 0 ? filters.join(' ') : 'none';
      };
      videoRef.current.style.filter = buildFilter(filterSettings);
    }
  }, [filterSettings, isPublishing]);
 
  // Stream-scoped Top Gifters (realtime + fallback polling)
  const { gifters: streamTopGifters } = useStreamTopGifters({
    liveStreamId: streamer?.live_stream_id ?? null,
    enabled: !!streamer?.live_stream_id,
    limit: 20,
  });

  // Get current user
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to stream');
        setLoading(false);
        return;
      }

      const canLive = canUserGoLiveSolo({ id: user.id, email: user.email });
      if (!canLive) {
        setError('Solo Live is temporarily disabled. Try Group Live in Live Central!');
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
    };
    initUser();
  }, [supabase]);

  // Viewer count: realtime subscription + fallback polling
  useEffect(() => {
    if (!streamer?.live_stream_id) {
      setViewerCount(0);
      return;
    }

    let cancelled = false;
    const liveStreamId = streamer.live_stream_id;

    const loadViewerCount = async () => {
      try {
        const res = await fetch(`/api/active-viewers?live_stream_id=${liveStreamId}`);
        if (!res.ok) {
          console.error('[SoloHostStream] Viewer count fetch failed:', res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled && typeof data.viewer_count === 'number') {
          setViewerCount(data.viewer_count);
        }
      } catch (err) {
        console.error('[SoloHostStream] Error loading viewer count:', err);
      }
    };

    // Initial load
    loadViewerCount();

    // Realtime subscription on active_viewers for INSERT/DELETE events
    const viewerChannel = supabase
      .channel(`active-viewers-host-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          // Viewer joined - increment count
          if (!cancelled) {
            setViewerCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          // Viewer left - decrement count (floor at 0)
          if (!cancelled) {
            setViewerCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log('[SoloHostStream] Viewer count realtime subscription:', status);
      });

    // Fallback polling every 60s (increased from 15s - realtime is primary)
    const interval = setInterval(loadViewerCount, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      viewerChannel.unsubscribe();
    };
  }, [streamer?.live_stream_id, supabase]);

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
              .eq('streaming_mode', 'solo') // Only solo mode streams
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle();

        const liveStream = activeStream ?? latestStream;

        const gifterStatuses = await fetchGifterStatuses([profile.id]);
        const gifterStatus = gifterStatuses[profile.id] || null;

        // Top gifters are stream-scoped and loaded via `useStreamTopGifters` (polling).

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

        console.log('[SoloHostStream] Using live_stream_id for chat/gifts:', streamerData.live_stream_id);

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

  // Load leaderboard rank for host
  useEffect(() => {
    const loadLeaderboardRank = async () => {
      if (!currentUserId) return;

      try {
        const { data, error } = await supabase.rpc('get_leaderboard', {
          p_type: 'top_streamers',
          p_period: 'daily',
          p_limit: 100,
          p_room_id: null,
        });

        if (error) {
          console.error('[SoloHostStream] Error fetching leaderboard rows:', error);
          return;
        }

        const rank = computeRankFromLeaderboardRows(currentUserId, Array.isArray(data) ? data : []);
        setLeaderboardRank(rank);
      } catch (err) {
        console.error('[SoloHostStream] Error loading leaderboard rank:', err);
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
          console.error('[SoloHostStream] Error fetching trending rank:', error);
          return;
        }

        if (data && Array.isArray(data)) {
          const rank = data.findIndex((s: any) => s.stream_id === streamer.live_stream_id);
          if (rank !== -1) {
            setTrendingRank(rank + 1); // 1-indexed
          } else {
            setTrendingRank(0);
          }
        }
      } catch (err) {
        console.error('[SoloHostStream] Error loading trending rank:', err);
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
  }, [currentUserId, streamer?.live_stream_id, streamer?.live_available, supabase]);

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

        // SOLO STREAM FIX: Use unique room name per profile_id to prevent host collision
        // Each solo streamer gets their own dedicated room: solo_${profile_id}
        // This ensures Account A (computer) and Account B (phone) NEVER collide
        const soloRoomName = `solo_${currentUserId}`;
        
        console.log('[SoloHostStream] 🔑 TOKEN REQUEST:', {
          profileId: currentUserId,
          liveStreamId: streamer?.live_stream_id,
          soloRoomName,
          role: 'host',
        });

        // Get LiveKit token - HOST MODE with unique solo room
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName: soloRoomName,
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

        const tokenData = await tokenResponse.json();
        const { token, url, roomName: mintedRoomName, identity: mintedIdentity, canPublish: mintedCanPublish } = tokenData;

        if (!token || !url) {
          throw new Error('Invalid token response');
        }

        // 🔍 DEBUG: Log token details to verify unique room/identity
        console.log('[SoloHostStream] ✅ TOKEN RECEIVED:', {
          mintedRoomName,
          mintedIdentity,
          mintedCanPublish,
          expectedRoomName: soloRoomName,
          url,
        });

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
          
          // IMPORTANT: Skip guest tracks - they go to GuestVideoOverlay, not host's main video
          if (participant.identity.startsWith('guest_')) {
            console.log('[SoloHostStream] Skipping GUEST track (handled by GuestVideoOverlay):', participant.identity);
            return;
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

  const handleLeaveSession = async () => {
    try {
      await endCurrentSession();
      await refreshBattleSession();
    } catch (err) {
      console.error('[SoloHostStream] Failed to leave session:', err);
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

  // Live device switching - switch camera while streaming
  const handleSwitchCamera = async (deviceId: string) => {
    const room = roomRef.current;
    if (!room || room.state !== 'connected') {
      console.log('[SoloHostStream] Cannot switch camera - room not connected');
      throw new Error('Room not connected');
    }

    const localParticipant = room.localParticipant;
    
    // Find current camera publication
    const cameraPublication = Array.from(localParticipant.trackPublications.values())
      .find(pub => pub.source === Track.Source.Camera && pub.track);
    
    if (cameraPublication && cameraPublication.track) {
      console.log('[SoloHostStream] Switching camera to:', deviceId);
      
      try {
        // Stop filter pipeline first
        filterPipeline.stopPipeline();
        
        // Unpublish current track
        await localParticipant.unpublishTrack(cameraPublication.track);
        cameraPublication.track.stop();
        
        // Stop old raw camera track
        if (rawCameraTrackRef.current) {
          rawCameraTrackRef.current.stop();
          rawCameraTrackRef.current = null;
        }
        
        // Create new track with new device
        const { createLocalTracks, VideoPresets } = await import('livekit-client');
        const [newVideoTrack] = await createLocalTracks({
          video: {
            deviceId: deviceId,
            resolution: VideoPresets.h1080,
          },
          audio: false,
        });
        
        // Store reference to raw track for filters
        rawCameraTrackRef.current = newVideoTrack.mediaStreamTrack;
        
        // Check if filters are active
        const isFiltersDefault = (
          filterSettings.blur === DEFAULT_FILTER_SETTINGS.blur &&
          filterSettings.smoothing === DEFAULT_FILTER_SETTINGS.smoothing &&
          filterSettings.brightness === DEFAULT_FILTER_SETTINGS.brightness &&
          filterSettings.contrast === DEFAULT_FILTER_SETTINGS.contrast &&
          filterSettings.saturation === DEFAULT_FILTER_SETTINGS.saturation
        );
        
        if (!isFiltersDefault) {
          // Re-apply filters with new camera track
          console.log('[SoloHostStream] Re-applying filters to new camera');
          setActiveVideoDeviceId(deviceId);
          // Small delay then re-apply filters
          setTimeout(() => handleApplyFilters(filterSettings), 100);
          return; // handleApplyFilters will handle publishing
        }
        
        // Publish new track (no filters)
        await localParticipant.publishTrack(newVideoTrack, {
          videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
          simulcast: true,
        });
        
        // Attach to video element
        if (videoRef.current) {
          newVideoTrack.attach(videoRef.current);
        }
        
        setActiveVideoDeviceId(deviceId);
        console.log('[SoloHostStream] Camera switched successfully');
      } catch (err) {
        console.error('[SoloHostStream] Error switching camera:', err);
        throw err;
      }
    } else {
      // No camera currently publishing - just update the state for next start
      setActiveVideoDeviceId(deviceId);
    }
  };

  // Live device switching - switch microphone while streaming
  const handleSwitchMicrophone = async (deviceId: string) => {
    const room = roomRef.current;
    if (!room || room.state !== 'connected') {
      console.log('[SoloHostStream] Cannot switch mic - room not connected');
      throw new Error('Room not connected');
    }

    const localParticipant = room.localParticipant;
    
    // Find current microphone publication
    const micPublication = Array.from(localParticipant.trackPublications.values())
      .find(pub => pub.source === Track.Source.Microphone && pub.track);
    
    if (micPublication && micPublication.track) {
      console.log('[SoloHostStream] Switching microphone to:', deviceId);
      
      try {
        // Unpublish current track
        await localParticipant.unpublishTrack(micPublication.track);
        micPublication.track.stop();
        
        // Create new track with new device
        const { createLocalTracks } = await import('livekit-client');
        const [newAudioTrack] = await createLocalTracks({
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        
        // Publish new track
        await localParticipant.publishTrack(newAudioTrack);
        
        setActiveAudioDeviceId(deviceId);
        console.log('[SoloHostStream] Microphone switched successfully');
      } catch (err) {
        console.error('[SoloHostStream] Error switching microphone:', err);
        throw err;
      }
    } else {
      // No mic currently publishing - just update the state for next start
      setActiveAudioDeviceId(deviceId);
    }
  };

  // Reset connection - soft media reinit without ending stream
  const handleResetConnection = async () => {
    const now = Date.now();
    // Debounce: 5 second cooldown between resets
    if (isResetting || now - lastResetRef.current < 5000) {
      console.log('[SoloHostStream] Reset blocked - already resetting or cooldown active');
      return;
    }
    lastResetRef.current = now;

    const room = roomRef.current;
    if (!room || room.state !== 'connected') {
      console.log('[SoloHostStream] Cannot reset - room not connected');
      return;
    }

    console.log('[SoloHostStream] Starting connection reset...');
    setIsResetting(true);

    try {
      const localParticipant = room.localParticipant;

      // 1. Snapshot current state
      const currentVideoDevice = activeVideoDeviceId;
      const currentAudioDevice = activeAudioDeviceId;
      const currentFilters = { ...filterSettings };
      const wasScreenSharing = isScreenSharing;

      // 2. Stop filter pipeline
      filterPipeline.stopPipeline();

      // 3. Find and unpublish camera and mic tracks
      const publications = Array.from(localParticipant.trackPublications.values());
      const camPub = publications.find(p => p.source === Track.Source.Camera && p.track);
      const micPub = publications.find(p => p.source === Track.Source.Microphone && p.track);

      if (camPub?.track && !wasScreenSharing) {
        console.log('[SoloHostStream] Unpublishing camera track');
        await localParticipant.unpublishTrack(camPub.track);
        camPub.track.stop();
      }
      if (micPub?.track) {
        console.log('[SoloHostStream] Unpublishing mic track');
        await localParticipant.unpublishTrack(micPub.track);
        micPub.track.stop();
      }

      // 4. Stop raw camera track if it exists
      if (rawCameraTrackRef.current) {
        rawCameraTrackRef.current.stop();
        rawCameraTrackRef.current = null;
      }

      // 5. Small delay to ensure devices are released
      await new Promise(r => setTimeout(r, 300));

      // 6. Recreate tracks
      const { createLocalTracks, LocalVideoTrack } = await import('livekit-client');
      
      // Only recreate camera if not screen sharing
      const trackOptions: any = {
        audio: {
          deviceId: currentAudioDevice ? { ideal: currentAudioDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      if (!wasScreenSharing) {
        trackOptions.video = {
          deviceId: currentVideoDevice ? { ideal: currentVideoDevice } : undefined,
          width: { ideal: 1920, max: 1920, min: 1280 },
          height: { ideal: 1080, max: 1080, min: 720 },
          frameRate: { ideal: 30, max: 30 },
        };
      }

      console.log('[SoloHostStream] Creating new tracks...', { 
        hasVideo: !!trackOptions.video, 
        hasAudio: !!trackOptions.audio 
      });
      
      const tracks = await createLocalTracks(trackOptions);

      const audioTrack = tracks.find(t => t.kind === 'audio');
      const videoTrack = tracks.find(t => t.kind === 'video');

      // 7. Publish mic first
      if (audioTrack) {
        console.log('[SoloHostStream] Publishing new mic track');
        await localParticipant.publishTrack(audioTrack);
      }

      // 8. Publish camera (with or without filters)
      if (videoTrack && !wasScreenSharing) {
        rawCameraTrackRef.current = videoTrack.mediaStreamTrack;

        // Check if filters are non-default
        if (!areFiltersDefault(currentFilters)) {
          console.log('[SoloHostStream] Re-applying filters after reset');
          const processedTrack = await filterPipeline.startPipeline(
            videoTrack.mediaStreamTrack, 
            currentFilters
          );

          if (processedTrack) {
            const filteredLocalTrack = new LocalVideoTrack(processedTrack, undefined, false);
            await localParticipant.publishTrack(filteredLocalTrack, {
              videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
              simulcast: true,
            });
          } else {
            // Fallback to raw track if filter pipeline fails
            await localParticipant.publishTrack(videoTrack, {
              videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
              simulcast: true,
            });
          }
        } else {
          console.log('[SoloHostStream] Publishing raw camera track (no filters)');
          await localParticipant.publishTrack(videoTrack, {
            videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
            simulcast: true,
          });
        }

        // Attach to preview
        if (videoRef.current) {
          videoTrack.attach(videoRef.current);
        }
      }

      // 9. Force GuestVideoOverlay remount to re-attach remote tracks
      setGuestOverlayKey(k => k + 1);

      console.log('[SoloHostStream] ✅ Connection reset successful');
      // Could add toast here: "Connection reset"

    } catch (err) {
      console.error('[SoloHostStream] ❌ Connection reset failed:', err);
      // Could add error toast here: "Reset failed — try restarting stream"
    } finally {
      setIsResetting(false);
    }
  };

  resetConnectionRef.current = handleResetConnection;

  // Start screen sharing - replaces camera video with screen
  const handleStartScreenShare = async () => {
    if (!screenShareSupported) {
      console.log('[SoloHostStream] Screen share not supported on this device');
      return;
    }

    const room = roomRef.current;
    if (!room || room.state !== 'connected') {
      console.log('[SoloHostStream] Cannot start screen share - room not connected');
      return;
    }

    try {
      console.log('[SoloHostStream] Starting screen share...');
      
      // Request screen share with system audio if supported
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true, // Request system audio (Chrome only)
      });

      screenShareStreamRef.current = screenStream;
      const localParticipant = room.localParticipant;

      // Find and unpublish current camera track
      const cameraPublication = Array.from(localParticipant.trackPublications.values())
        .find(pub => pub.source === Track.Source.Camera && pub.track);
      
      if (cameraPublication && cameraPublication.track) {
        console.log('[SoloHostStream] Unpublishing camera track...');
        await localParticipant.unpublishTrack(cameraPublication.track);
        cameraPublication.track.stop();
      }

      // Import LiveKit classes
      const { LocalVideoTrack, LocalAudioTrack } = await import('livekit-client');

      // Create and publish screen share video track
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (screenVideoTrack) {
        const localVideoTrack = new LocalVideoTrack(screenVideoTrack, undefined, false);
        localVideoTrack.source = Track.Source.ScreenShare;
        
        await localParticipant.publishTrack(localVideoTrack, {
          videoEncoding: { maxBitrate: 3_000_000, maxFramerate: 30 },
          simulcast: true,
        });
        
        // Attach to preview
        if (videoRef.current) {
          localVideoTrack.attach(videoRef.current);
        }
        
        console.log('[SoloHostStream] Screen share video published');
      }

      // Handle system audio if available (Chrome only)
      const screenAudioTrack = screenStream.getAudioTracks()[0];
      if (screenAudioTrack) {
        console.log('[SoloHostStream] System audio available, publishing...');
        const localAudioTrack = new LocalAudioTrack(screenAudioTrack, undefined, false);
        localAudioTrack.source = Track.Source.ScreenShareAudio;
        
        await localParticipant.publishTrack(localAudioTrack);
        console.log('[SoloHostStream] System audio published');
      } else {
        console.log('[SoloHostStream] No system audio available (Safari/Firefox limitation)');
      }

      // Listen for browser "Stop Sharing" event
      screenVideoTrack.onended = () => {
        console.log('[SoloHostStream] Screen share ended by browser');
        handleStopScreenShare();
      };

      setIsScreenSharing(true);
      console.log('[SoloHostStream] Screen share started successfully');
      
    } catch (err: any) {
      console.error('[SoloHostStream] Error starting screen share:', err);
      if (err.name === 'NotAllowedError') {
        // User cancelled - silently ignore
        console.log('[SoloHostStream] User cancelled screen share');
      }
    }
  };

  // Stop screen sharing - reverts to camera
  const handleStopScreenShare = async () => {
    const room = roomRef.current;
    if (!room || room.state !== 'connected') {
      setIsScreenSharing(false);
      return;
    }

    try {
      console.log('[SoloHostStream] Stopping screen share...');
      const localParticipant = room.localParticipant;

      // Find and unpublish screen share tracks
      const screenPublications = Array.from(localParticipant.trackPublications.values())
        .filter(pub => 
          (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) && 
          pub.track
        );
      
      for (const pub of screenPublications) {
        if (pub.track) {
          console.log('[SoloHostStream] Unpublishing screen share track:', pub.source);
          await localParticipant.unpublishTrack(pub.track);
          pub.track.stop();
        }
      }

      // Stop the screen share stream
      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => track.stop());
        screenShareStreamRef.current = null;
      }

      // Re-publish camera
      console.log('[SoloHostStream] Re-publishing camera...');
      const { createLocalTracks, VideoPresets } = await import('livekit-client');
      
      const [newVideoTrack] = await createLocalTracks({
        video: activeVideoDeviceId 
          ? { 
              deviceId: activeVideoDeviceId,
              resolution: VideoPresets.h1080,
            }
          : {
              facingMode: 'user',
              resolution: VideoPresets.h1080,
            },
        audio: false,
      });

      await localParticipant.publishTrack(newVideoTrack, {
        videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
        simulcast: true,
      });

      // Attach to preview
      if (videoRef.current) {
        newVideoTrack.attach(videoRef.current);
      }

      setIsScreenSharing(false);
      console.log('[SoloHostStream] Screen share stopped successfully');
      
    } catch (err) {
      console.error('[SoloHostStream] Error stopping screen share:', err);
    }
  };

  // Build CSS filter string for preview
  const buildCssFilterString = useCallback((settings: VideoFilterSettings): string => {
    const filters: string[] = [];
    const totalBlur = settings.blur + (settings.smoothing * 0.35);
    if (totalBlur > 0) filters.push(`blur(${totalBlur}px)`);
    if (settings.brightness !== 1) filters.push(`brightness(${settings.brightness})`);
    if (settings.contrast !== 1) filters.push(`contrast(${settings.contrast})`);
    if (settings.saturation !== 1) filters.push(`saturate(${settings.saturation})`);
    return filters.length > 0 ? filters.join(' ') : 'none';
  }, []);

  // Preview filters (lightweight - CSS only, no track replacement)
  // Used for live preview while dragging sliders
  const handlePreviewFilters = useCallback((settings: VideoFilterSettings) => {
    setFilterSettings(settings);
    // Apply CSS filter directly to video element for instant preview
    if (videoRef.current) {
      videoRef.current.style.filter = buildCssFilterString(settings);
    }
    // Also update the pipeline settings ref (for when pipeline is running)
    filterPipeline.updateFilters(settings);
  }, [filterPipeline, buildCssFilterString]);

  // Apply video filters using canvas pipeline (full track replacement)
  const handleApplyFilters = async (settings: VideoFilterSettings) => {
    console.log('[SoloHostStream] Applying filters:', settings);
    
    // Save settings
    setFilterSettings(settings);
    saveFilterSettings(settings);
    
    const room = roomRef.current;
    if (!room || room.state !== 'connected') {
      console.log('[SoloHostStream] Room not connected, filters will apply on next publish');
      return;
    }
    
    // Don't apply filters during screen share
    if (isScreenSharing) {
      console.log('[SoloHostStream] Screen sharing active, skipping filter application');
      return;
    }
    
    const localParticipant = room.localParticipant;
    
    // Find current camera publication
    const cameraPublication = Array.from(localParticipant.trackPublications.values())
      .find(pub => pub.source === Track.Source.Camera && pub.track);
    
    if (!cameraPublication || !cameraPublication.track) {
      console.log('[SoloHostStream] No camera track to filter');
      return;
    }
    
    // Check if filters are all default (no processing needed)
    const isDefault = (
      settings.blur === DEFAULT_FILTER_SETTINGS.blur &&
      settings.smoothing === DEFAULT_FILTER_SETTINGS.smoothing &&
      settings.brightness === DEFAULT_FILTER_SETTINGS.brightness &&
      settings.contrast === DEFAULT_FILTER_SETTINGS.contrast &&
      settings.saturation === DEFAULT_FILTER_SETTINGS.saturation
    );
    
    try {
      if (isDefault) {
        // Revert to raw camera track
        console.log('[SoloHostStream] Filters at default, reverting to raw camera');
        filterPipeline.stopPipeline();
        
        // Get raw camera track if we have it
        if (rawCameraTrackRef.current && rawCameraTrackRef.current.readyState === 'live') {
          // Unpublish current and republish raw
          await localParticipant.unpublishTrack(cameraPublication.track);
          
          const { LocalVideoTrack } = await import('livekit-client');
          const rawLocalTrack = new LocalVideoTrack(rawCameraTrackRef.current, undefined, false);
          await localParticipant.publishTrack(rawLocalTrack, {
            videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
            simulcast: true,
          });
          
          if (videoRef.current) {
            rawLocalTrack.attach(videoRef.current);
          }
          console.log('[SoloHostStream] Reverted to raw camera track');
        }
      } else {
        // Apply filters via canvas pipeline
        console.log('[SoloHostStream] Applying canvas filter pipeline');
        
        // Get the underlying MediaStreamTrack
        let sourceTrack: MediaStreamTrack;
        
        // Use raw camera track as source if available
        if (rawCameraTrackRef.current && rawCameraTrackRef.current.readyState === 'live') {
          sourceTrack = rawCameraTrackRef.current;
        } else {
          // Get track from current publication
          sourceTrack = cameraPublication.track.mediaStreamTrack;
          // Clone and store as raw
          const stream = await navigator.mediaDevices.getUserMedia({
            video: activeVideoDeviceId 
              ? { deviceId: { exact: activeVideoDeviceId } }
              : { facingMode: 'user' },
            audio: false,
          });
          rawCameraTrackRef.current = stream.getVideoTracks()[0];
          sourceTrack = rawCameraTrackRef.current;
        }
        
        // Update filter settings in pipeline
        filterPipeline.updateFilters(settings);
        
        // Start pipeline - wait for processed track via Promise
        const processedTrack = await filterPipeline.startPipeline(sourceTrack, settings);
        
        if (processedTrack) {
          // Unpublish current track
          await localParticipant.unpublishTrack(cameraPublication.track);
          
          // Publish processed track
          const { LocalVideoTrack } = await import('livekit-client');
          const filteredLocalTrack = new LocalVideoTrack(processedTrack, undefined, false);
          await localParticipant.publishTrack(filteredLocalTrack, {
            videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
            simulcast: true,
          });
          
          if (videoRef.current) {
            filteredLocalTrack.attach(videoRef.current);
          }
          
          console.log('[SoloHostStream] Published filtered track');
        } else {
          console.log('[SoloHostStream] Pipeline returned null (filters at default)');
        }
      }
    } catch (err) {
      console.error('[SoloHostStream] Error applying filters:', err);
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

  // Mobile container class for full-bleed layout on phone widths
  // CRITICAL: Start with black background to prevent white flash during SSR/hydration
  // Always include bg-black as base class - mobile CSS will override with its own black bg
  const containerClass = isMobileWeb
    ? 'mobile-live-container mobile-live-v3 bg-black'
    : 'min-h-screen bg-black lg:bg-gray-50 lg:dark:bg-gray-900 overflow-hidden lg:overflow-auto';

  return (
    <div className={containerClass}>
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
      {/* bg-black ensures no white flash during SSR/hydration */}
      <div className="flex relative h-screen pt-0 overflow-hidden bg-black">
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
              <div className="flex items-center gap-1">
                {isInActiveSession && (
                  <button
                    onClick={handleLeaveSession}
                    className="text-white hover:opacity-80 transition-opacity"
                    title="Leave Battle/Cohost"
                    type="button"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </button>
                )}

                {/* Left: Streamer name bubble */}
                <div className="relative flex flex-col">
                  {/* Main profile bubble */}
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1">
                    <div className="flex items-center gap-1.5">
                    <Image
                      src={getAvatarUrl(streamer.avatar_url)}
                      alt={streamer.username}
                      width={24}
                      height={24}
                      className="rounded-full cursor-pointer"
                      onClick={() => setShowMiniProfile(true)}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <UserNameWithBadges
                          profileId={streamer.profile_id}
                          name={streamer.display_name || streamer.username}
                          gifterStatus={streamer.gifter_status}
                          textSize="text-xs"
                          nameClassName="font-bold text-white"
                          clickable
                          onClick={() => setShowMiniProfile(true)}
                          showGifterBadge={false}
                        />
                      </div>
                      {/* Trending/Leaderboard buttons row */}
                      <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                        <button 
                          onClick={() => setShowTrending(true)}
                          className="flex items-center gap-0.5 hover:text-white transition-colors cursor-pointer"
                          type="button"
                        >
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span className="font-semibold text-[11px]">{trendingRank ?? 0}</span>
                        </button>
                        <span className="text-white/40">•</span>
                        <button 
                          onClick={() => setShowLeaderboard(true)}
                          className="flex items-center gap-0.5 hover:text-white transition-colors cursor-pointer"
                          type="button"
                        >
                          <Trophy className="w-3 h-3 text-yellow-500" />
                          <span className="font-semibold text-[11px]">
                            {leaderboardRank?.current_rank ?? 0}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                </div>
              </div>
              
            {/* Viewer count - centered on desktop, positioned right (near X) on mobile to avoid collision with username */}
              <button
                onClick={() => setShowViewers(true)}
                className="absolute right-14 md:right-auto md:left-1/2 md:-translate-x-1/2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 md:px-4 md:py-2 shadow-lg flex items-center gap-1.5 hover:bg-black/50 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">{viewerCount.toLocaleString()}</span>
              </button>
              
              {/* Right: Top 3 Gifters + X + Share (vertical stack) */}
              <div className="flex items-center gap-2">
                {/* X Button - inline with gifters */}
                <button
                  onClick={handleExit}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                  title="Exit Stream"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              className="absolute z-30 left-4 right-4 flex items-center justify-between pointer-events-none"
              style={{ top: 'calc(max(1rem, env(safe-area-inset-top)) + 3.25rem)' }}
            >
              <div className="flex flex-col gap-2 pointer-events-auto">
                {leaderboardRank && leaderboardRank.current_rank > 0 && leaderboardRank.current_rank <= 100 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-500/90 to-orange-500/90 border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/30 backdrop-blur-md w-fit">
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
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-gray-600/90 to-gray-700/90 border-2 border-gray-500/50 shadow-lg backdrop-blur-md w-fit">
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
                {showEarlyAccessBanner && (
                  <div className="relative max-w-[320px] rounded-2xl bg-black/70 text-white border border-white/10 backdrop-blur-md shadow-lg px-4 py-3 pointer-events-auto">
                    <button
                      type="button"
                      onClick={handleDismissEarlyAccessBanner}
                      aria-label="Dismiss early access notice"
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-sm font-semibold flex items-center gap-2 pr-6">
                      <span>⚠️ Early Access</span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-white/80">
                      Solo Live is available in early access. Some features (Battles, Co-host) are still in active development and may not work as intended yet.
                    </p>
                    <p className="mt-2 text-[10px] text-white/55 leading-tight">
                      Features will unlock progressively as development continues.
                    </p>
                  </div>
                )}
              </div>

              {topGifters.length > 0 && (
                <div className="flex items-center gap-1 pointer-events-auto">
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
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={getAvatarUrl(gifter.avatar_url)}
                            alt={gifter.username}
                            width={28}
                            height={28}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors pointer-events-auto"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Video element OR Battle Grid */}
            {isInActiveSession && battleSession && currentUserId && streamer ? (
              /* Battle/Cohost Grid - replaces solo video during active session */
              <BattleGridWrapper
                session={battleSession}
                currentUserId={currentUserId}
                currentUserName={streamer.display_name || streamer.username}
                canPublish={true}
                remainingSeconds={battleRemainingSeconds}
                className="w-full h-full box-border pt-28 pb-[38vh]"
                onRefreshSession={refreshBattleSession}
              />
            ) : (
              /* Solo video element - normal host view */
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
                  zIndex: 10,
                  // Mirror on mobile for camera preview, but NOT for screen share
                  transform: isMobileWeb && !isScreenSharing ? 'scaleX(-1)' : undefined,
                }}
              />
            )}

            {/* Offline placeholder */}
            {!isPublishing && !isInActiveSession && (
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

            {/* Guest Video Overlay - Floating boxes for up to 2 guests */}
            {isPublishing && streamer.live_stream_id ? (
              <GuestVideoOverlay
                key={guestOverlayKey}
                liveStreamId={streamer.live_stream_id}
                hostId={currentUserId || undefined}
                currentUserId={currentUserId || undefined}
                isHost={true}
                room={roomRef.current}
                onGuestLeave={() => {
                  // Host doesn't leave as guest, but this handles the realtime update
                  console.log('[SoloHostStream] Guest removed');
                }}
              />
            ) : null}
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
                isShareGuardActiveRef={isShareActiveRef}
                onGoLive={(liveStreamId, profileId) => {
                  console.log('🆕🆕🆕 [SoloHostStream] NEW STREAM CREATED! live_stream_id:', liveStreamId);
                  console.log('🆕🆕🆕 [SoloHostStream] Profile ID:', profileId);
                  if (liveStreamId) {
                    console.log('🆕🆕🆕 [SoloHostStream] Updating streamer state with NEW live_stream_id');
                    setStreamer(prev => {
                      console.log('🆕🆕🆕 [SoloHostStream] Previous streamer:', prev);
                      const updated = prev ? { ...prev, live_stream_id: liveStreamId, live_available: true } : prev;
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
                onClick={() => setShowBattle(true)}
                className="flex flex-col items-center gap-1 text-white hover:text-orange-400 transition-colors"
                title="Battle"
              >
                <Swords className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => setShowCoHost(true)}
                className="flex flex-col items-center gap-1 text-white hover:text-purple-400 transition-colors"
                title="Co-Host"
              >
                <UserPlus className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => setShowGuests(true)}
                className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition-colors"
                title="Guests"
              >
                <Users className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => setShowSettings(true)}
                className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition-colors"
                title="Settings"
              >
                <Settings className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => setShowFilters(true)}
                className="flex flex-col items-center gap-1 text-white hover:text-cyan-400 transition-colors"
                title="Filters"
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
          bottom-16 left-0 right-0
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

      {/* Host Stream Settings Modal */}
      <HostStreamSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSwitchCamera={handleSwitchCamera}
        onSwitchMicrophone={handleSwitchMicrophone}
        activeVideoDeviceId={activeVideoDeviceId}
        activeAudioDeviceId={activeAudioDeviceId}
        onResetConnection={handleResetConnection}
        isResetting={isResetting}
      />

      {/* Co-Host Invite Modal */}
      <CoHostInviteModal
        isOpen={showCoHost}
        onClose={() => setShowCoHost(false)}
      />

      {/* Guest Requests Modal */}
      <GuestRequestsModal
        isOpen={showGuests}
        onClose={() => setShowGuests(false)}
        liveStreamId={streamer.live_stream_id}
        hostId={currentUserId || undefined}
      />

      {/* Stream Filters Modal */}
      <StreamFiltersModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onPreview={handlePreviewFilters}
        currentSettings={filterSettings}
      />

      {/* Battle Invite Modal */}
      <BattleInviteModal
        isOpen={showBattle}
        onClose={() => setShowBattle(false)}
        onSessionStarted={(sessionId) => {
          console.log('[SoloHostStream] Battle session started:', sessionId);
          refreshBattleSession();
        }}
      />
      
      {/* Incoming Battle Request Stack */}
      {isPublishing && pendingInvites.length > 0 && (
        <IncomingBattleRequestStack
          invites={pendingInvites}
          onAccepted={(sessionId) => {
            console.log('[SoloHostStream] Invite accepted, session:', sessionId);
            refreshBattleSession();
          }}
          onDeclined={handleInviteDeclined}
        />
      )}
      
      {/* Cooldown Sheet */}
      {battleSession && battleOpponent && (
        <CooldownSheet
          isOpen={showCooldown}
          mode={battleSession.mode}
          remainingSeconds={battleRemainingSeconds}
          opponentName={battleOpponent.display_name || battleOpponent.username}
          onRematch={async () => {
            await triggerRematch();
            setShowCooldown(false);
          }}
          onBackToPool={async () => {
            await endCurrentSession();
            await joinBattlePool();
            setShowCooldown(false);
          }}
          onQuit={async () => {
            await endCurrentSession();
            setShowCooldown(false);
          }}
          onClose={() => setShowCooldown(false)}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          // Clear share guard after modal closes
          setTimeout(() => {
            isShareActiveRef.current = false;
          }, 1000);
        }}
        title={`${streamer?.display_name || streamer?.username}'s Live Stream`}
        url={typeof window !== 'undefined' ? window.location.href : `https://www.mylivelinks.com/live/${streamer?.username || ''}`}
        thumbnailUrl={streamer?.avatar_url}
        contentType="live"
      />
    </div>
  );
}
