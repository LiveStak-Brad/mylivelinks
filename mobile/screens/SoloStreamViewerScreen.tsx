import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Image, ScrollView, Modal, Switch, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../types/navigation';
import { useThemeMode } from '../contexts/ThemeContext';
import { useKeepAwake } from 'expo-keep-awake';
import { useLiveRoomParticipants } from '../hooks/useLiveRoomParticipants';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { GiftOverlay } from '../overlays/GiftOverlay';
import { supabase } from '../lib/supabase';
import type { Participant } from '../types/live';
import { useChatMessages } from '../hooks/useChatMessages';
import { LiveChatActionBar } from '../components/live/LiveChatActionBar';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useViewerHeartbeat } from '../hooks/useViewerHeartbeat';
import { fetchWithWebSession } from '../lib/webSession';
import { ensureLiveKitReady } from '../lib/livekit/ensureLiveKitReady';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'SoloStreamViewer'>;

type StreamerProfile = {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

type TopGifter = {
  profile_id: string;
  username: string;
  avatar_url?: string | null;
  total_coins: number;
};

export function SoloStreamViewerScreen({ navigation, route }: Props) {
  // P0: Safe shell first render. Do not touch LiveKit/Tile until after ensureLiveKitReady() succeeds.
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeMode();

  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [TileComponent, setTileComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setInitError(null);
        await ensureLiveKitReady();
        const tileMod: any = await import('../components/live/Tile');
        if (!tileMod?.Tile) {
          throw new Error('LIVEKIT_TILE_MISSING');
        }
        if (!mounted) return;
        setTileComponent(() => tileMod.Tile);
        setReady(true);
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : String(e);
        if (mounted) {
          setReady(false);
          setTileComponent(null);
          setInitError(msg);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [retryNonce]);

  const handleBack = useCallback(() => {
    try {
      navigation.goBack();
    } catch {
      navigation.navigate('Home' as any);
    }
  }, [navigation]);

  if (!ready || !TileComponent) {
    const shellPaddingTop = Math.max(12, (insets.top || 0) + 12);
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ paddingTop: shellPaddingTop, paddingHorizontal: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900' }}>Live</Text>
          <View style={{ width: 54 }} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}>
          <View style={{ width: '100%', maxWidth: 340, aspectRatio: 9 / 16, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.15)' }} />
          <Text style={{ marginTop: 14, color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
            {initError ? 'Live video unavailable (LiveKit init failed).' : 'Preparing live video…'}
          </Text>
          {initError ? (
            <Text style={{ marginTop: 8, color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' }} numberOfLines={4}>
              {initError}
            </Text>
          ) : (
            <ActivityIndicator style={{ marginTop: 12 }} />
          )}

          {initError ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={handleBack} activeOpacity={0.85} style={{ backgroundColor: theme.colors.cardSurface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '900' }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRetryNonce((n) => n + 1)}
                activeOpacity={0.85}
                style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return <SoloStreamViewerScreenLive navigation={navigation} route={route} TileComponent={TileComponent} />;
}

function SoloStreamViewerScreenLive({ navigation, route, TileComponent }: Props & { TileComponent: React.ComponentType<any> }) {
  useKeepAwake();

  const insets = useSafeAreaInsets();
  const { theme } = useThemeMode();

  const username = route.params?.username;

  const [viewer, setViewer] = useState<{ id: string; username: string } | null>(null);
  const [streamer, setStreamer] = useState<StreamerProfile | null>(null);
  const [loadingStreamer, setLoadingStreamer] = useState(true);
  const [streamerLiveStreamId, setStreamerLiveStreamId] = useState<number | null>(null);
  const [streamerIsLive, setStreamerIsLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState<string | null>(null);

  const [showGifts, setShowGifts] = useState(false);
  const [targetRecipientId, setTargetRecipientId] = useState<string | null>(null);

  const [showViewers, setShowViewers] = useState(false);
  const [activeViewers, setActiveViewers] = useState<Array<{ viewer_id: string; username: string; avatar_url?: string | null; last_active_at: string }>>([]);
  const [activeViewersLoading, setActiveViewersLoading] = useState(false);
  const [viewerCountDb, setViewerCountDb] = useState<number | null>(null);
  const [viewerTrackingDisabled, setViewerTrackingDisabled] = useState(false);
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [trendingRank, setTrendingRank] = useState<number | null>(null);

  const [showChatSettings, setShowChatSettings] = useState(false);
  const [chatShowAvatars, setChatShowAvatars] = useState(true);
  const [chatBubbleColor, setChatBubbleColor] = useState('#a855f7');
  const [chatFont, setChatFont] = useState('Inter');
  const [chatSaving, setChatSaving] = useState(false);

  const [chatInputText, setChatInputText] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);

  const { giftingEnabled } = useFeatureFlags();

  // SOLO STREAM FIX: Join the streamer's dedicated solo room
  // Wait until streamer profile is loaded to get their profile_id for room name
  const soloRoomName = streamer?.id ? `solo_${streamer.id}` : undefined;
  
  const { participants, isConnected, room, connectionError } = useLiveRoomParticipants({ 
    enabled: !!streamer?.id, // Only enable once we know the streamer's room
    roomName: soloRoomName,
  });

  useEffect(() => {
    let cancelled = false;

    const loadViewer = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user?.id) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (cancelled) return;
        if (!profile?.username) return;

        setViewer({ id: user.id, username: profile.username });
      } catch {
        // ignore
      }
    };

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, []);

  useRoomPresence({
    userId: viewer?.id ?? null,
    username: viewer?.username ?? null,
    enabled: !!viewer?.id && !!viewer?.username,
  });

  useEffect(() => {
    let cancelled = false;

    const loadStreamer = async () => {
      if (!username) {
        setLoadingStreamer(false);
        return;
      }

      setLoadingStreamer(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('username', username)
          .single();

        if (cancelled) return;

        if (error || !profile) {
          throw new Error(error?.message || 'Streamer not found');
        }

        setStreamer(profile as any);

        let liveStream: any = null;
        try {
          const { data } = await supabase
            .from('live_streams')
            .select('id, live_available, stream_title')
            .eq('profile_id', (profile as any).id)
            .eq('live_available', true)
            .maybeSingle();
          liveStream = data as any;
        } catch (err) {
          const { data } = await supabase
            .from('live_streams')
            .select('id, live_available')
            .eq('profile_id', (profile as any).id)
            .eq('live_available', true)
            .maybeSingle();
          liveStream = data as any;
        }

        if (cancelled) return;

        setStreamerLiveStreamId((liveStream as any)?.id ?? null);
        setStreamTitle((liveStream as any)?.stream_title ?? null);
        setStreamerIsLive(Boolean((liveStream as any)?.live_available));
      } catch (err: any) {
        if (cancelled) return;
        Alert.alert('Stream unavailable', err?.message || 'Unable to load stream');
      } finally {
        if (!cancelled) setLoadingStreamer(false);
      }
    };

    void loadStreamer();

    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (!streamer?.id) {
      setTopGifters([]);
      return;
    }

    let cancelled = false;

    const loadTopGifters = async () => {
      try {
        const { data, error } = await supabase
          .from('gifts')
          .select(`
            sender_id,
            coin_value,
            profiles!gifts_sender_id_fkey (
              username,
              avatar_url
            )
          `)
          .eq('recipient_id', streamer.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        if (cancelled) return;

        const totals = (data || []).reduce((acc: Record<string, TopGifter>, gift: any) => {
          const senderId = gift.sender_id;
          if (!senderId) return acc;
          if (!acc[senderId]) {
            acc[senderId] = {
              profile_id: senderId,
              username: gift.profiles?.username || 'Unknown',
              avatar_url: gift.profiles?.avatar_url ?? null,
              total_coins: 0,
            };
          }
          acc[senderId].total_coins += gift.coin_value || 0;
          return acc;
        }, {});

        const topThree = Object.values(totals)
          .sort((a, b) => b.total_coins - a.total_coins)
          .slice(0, 3);

        setTopGifters(topThree);
      } catch (error) {
        if (!cancelled) {
          console.warn('[GIFTERS][MOBILE] failed to load:', error);
          setTopGifters([]);
        }
      }
    };

    loadTopGifters();

    return () => {
      cancelled = true;
    };
  }, [streamer?.id]);

  const remoteStreamers = useMemo(() => {
    const r = room as any;
    if (!r) return [] as any[];
    return Array.from(r.remoteParticipants.values()).filter((p) => {
      const raw: any = p as any;
      const pubs = raw?.videoTrackPublications ? Array.from(raw.videoTrackPublications.values()) : [];
      // eligible: must have at least one subscribed video track
      return pubs.some((pub: any) => !!pub?.track && !!pub?.isSubscribed);
    });
  }, [room]);

  const selectedRemoteIdentity = useMemo(() => {
    if (!streamer?.id) return null;

    // Preferred: find participant where metadata profile_id matches
    for (const p of remoteStreamers) {
      const raw: any = p as any;
      const metadataRaw = raw?.metadata;
      if (!metadataRaw) continue;
      try {
        const parsed = typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : metadataRaw;
        if (parsed?.profile_id && String(parsed.profile_id) === String(streamer.id)) {
          return p.identity;
        }
      } catch {
        // ignore
      }
    }

    // Fallback: match by name (token sets `name: participantName`)
    for (const p of remoteStreamers) {
      if (p.name && streamer?.id && String(p.name) === String(streamer.id)) {
        return p.identity;
      }
    }

    return null;
  }, [remoteStreamers, streamer?.id]);

  const tileParticipant: Participant | null = useMemo(() => {
    if (!room || !selectedRemoteIdentity) return null;

    const r = room as any;
    const p = r.remoteParticipants.get(selectedRemoteIdentity);
    if (!p) return null;

    return {
      identity: p.identity,
      username: streamer?.display_name || streamer?.username || p.name || p.identity,
      isSpeaking: (p as any).isSpeaking,
      isCameraEnabled: true,
      isMicEnabled: true,
      isLocal: false,
      viewerCount: undefined,
    };
  }, [room, selectedRemoteIdentity, streamer?.display_name, streamer?.username]);

  const visibleParticipantsForGiftOverlay = useMemo(() => {
    const base = [...participants];

    // If our chosen streamer isn't in the participants list for any reason, ensure they appear
    if (tileParticipant && !base.some((x) => x.identity === tileParticipant.identity)) {
      base.unshift(tileParticipant);
    }

    return base;
  }, [participants, tileParticipant]);

  useEffect(() => {
    if (!targetRecipientId && tileParticipant?.identity) {
      setTargetRecipientId(tileParticipant.identity);
    }
  }, [targetRecipientId, tileParticipant?.identity]);

  const handleExit = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleShare = useCallback(async () => {
    try {
      const handle = streamer?.username ? `@${streamer.username}` : (username ? `@${username}` : 'MyLiveLinks');
      const url = username
        ? `https://www.mylivelinks.com/live/${encodeURIComponent(username)}`
        : 'https://www.mylivelinks.com';

      await Share.share({
        message: `${handle} is live on MyLiveLinks. Join: ${url}`,
        url,
        title: `${handle} • Live`,
      });
    } catch (err: any) {
      Alert.alert('Share failed', err?.message || 'Could not open share sheet');
    }
  }, [streamer?.username, username]);

  const headerDisplayName = streamer?.display_name || streamer?.username || username || 'Live';
  const headerStreamTitle = streamTitle || `${headerDisplayName}'s stream`;

  const hasSelectedStreamer = !!tileParticipant;
  const shouldShowWaiting = isConnected && !hasSelectedStreamer;

  const viewerCountLiveKitFallback = useMemo(() => {
    const r = room as any;
    if (!r) return 0;
    const remoteCount = r.remoteParticipants?.size ?? 0;
    const streamerPresent = selectedRemoteIdentity ? 1 : 0;
    return Math.max(0, remoteCount - streamerPresent);
  }, [room, selectedRemoteIdentity]);

  const viewerCount = viewerCountDb ?? viewerCountLiveKitFallback;

  const watchSessionKey = useMemo(() => {
    if (!streamerLiveStreamId || !viewer?.id) return null;
    return `solo:${viewer.id}:${streamerLiveStreamId}`;
  }, [streamerLiveStreamId, viewer?.id]);

  useViewerHeartbeat({
    liveStreamId: streamerLiveStreamId || 0,
    isActive: Boolean(streamerIsLive && isConnected && !streamEnded),
    isUnmuted: !isMuted,
    isVisible: true,
    isSubscribed: !!isConnected,
    enabled: Boolean(streamerLiveStreamId && streamerIsLive),
    slotIndex: 0,
    watchSessionKey: watchSessionKey || undefined,
  });

  useEffect(() => {
    if (!streamerLiveStreamId || !viewer?.id || !streamerIsLive) return;
    let cancelled = false;

    const ping = async (is_active = true) => {
      try {
        await fetchWithWebSession('/api/active-viewers/heartbeat', {
          method: 'POST',
          body: JSON.stringify({
            live_stream_id: streamerLiveStreamId,
            viewer_id: viewer.id,
            is_active,
            is_unmuted: !isMuted,
            is_visible: true,
            is_subscribed: !!isConnected,
          }),
        }, { contentTypeJson: true });
      } catch (error) {
        console.warn('[HEARTBEAT][SERVICE][MOBILE] failed:', error);
      }
    };

    ping(true);
    const interval = setInterval(() => {
      if (!cancelled) {
        void ping(true);
      }
    }, 12_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void ping(false);
    };
  }, [viewer?.id, streamerLiveStreamId, streamerIsLive, isMuted, isConnected]);

  useEffect(() => {
    if (!streamer?.id) {
      setLeaderboardRank(null);
      setTrendingRank(null);
      return;
    }

    let cancelled = false;

    const loadLeaderboardRank = async () => {
      try {
        const { data, error } = await supabase.rpc('rpc_get_leaderboard_rank', {
          p_profile_id: streamer.id,
          p_leaderboard_type: 'top_streamers_daily',
        });

        if (error) throw error;
        if (cancelled) return;

        const rank = Array.isArray(data) && data.length > 0 ? data[0]?.current_rank ?? null : null;
        setLeaderboardRank(rank);
      } catch (error) {
        if (!cancelled) {
          console.warn('[LEADERBOARD][MOBILE] failed to load:', error);
          setLeaderboardRank(null);
        }
      }
    };

    const loadTrendingRank = async () => {
      if (!streamerLiveStreamId || !streamerIsLive) {
        setTrendingRank(null);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('rpc_get_trending_live_streams', {
          p_limit: 100,
          p_offset: 0,
        });

        if (error) throw error;
        if (cancelled) return;

        if (Array.isArray(data)) {
          const idx = data.findIndex((entry: any) => entry.stream_id === streamerLiveStreamId);
          setTrendingRank(idx >= 0 ? idx + 1 : null);
        } else {
          setTrendingRank(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[TRENDING][MOBILE] failed to load:', error);
          setTrendingRank(null);
        }
      }
    };

    const refresh = () => {
      loadLeaderboardRank();
      loadTrendingRank();
    };

    refresh();
    const interval = setInterval(refresh, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamer?.id, streamerLiveStreamId, streamerIsLive]);

  const refreshViewerCount = useCallback(async (liveStreamId: number) => {
    if (viewerTrackingDisabled) return;
    try {
      const response = await fetchWithWebSession(`/api/active-viewers?live_stream_id=${liveStreamId}`);
      if (!response.ok) {
        throw new Error('viewer_count_failed');
      }
      const data = await response.json().catch(() => null);
      const nextCount = typeof data?.viewer_count === 'number' ? data.viewer_count : 0;
      setViewerCountDb(nextCount);
    } catch {
      setViewerCountDb(null);
      setViewerTrackingDisabled(true);
    }
  }, [viewerTrackingDisabled]);

  useEffect(() => {
    if (!streamerLiveStreamId) {
      setViewerCountDb(null);
      return;
    }
    void refreshViewerCount(streamerLiveStreamId);
    const interval = setInterval(() => {
      void refreshViewerCount(streamerLiveStreamId);
    }, 15_000);
    return () => clearInterval(interval);
  }, [refreshViewerCount, streamerLiveStreamId]);

  const loadActiveViewers = useCallback(async () => {
    if (!streamerLiveStreamId || viewerTrackingDisabled) {
      setActiveViewers([]);
      return;
    }
    setActiveViewersLoading(true);
    try {
      const response = await fetchWithWebSession(`/api/active-viewers/list?live_stream_id=${streamerLiveStreamId}`);
      if (!response.ok) {
        throw new Error('viewer_list_failed');
      }
      const data = await response.json().catch(() => null);
      const viewers = Array.isArray(data?.viewers) ? data.viewers : [];
      setActiveViewers(
        viewers.map((viewer: any) => ({
          viewer_id: viewer.profile_id,
          username: viewer.username || 'Unknown',
          avatar_url: viewer.avatar_url ?? null,
          last_active_at: viewer.last_seen,
        }))
      );
    } catch {
      setActiveViewers([]);
      setViewerTrackingDisabled(true);
    } finally {
      setActiveViewersLoading(false);
    }
  }, [streamerLiveStreamId, viewerTrackingDisabled]);

  useEffect(() => {
    if (!showViewers) return;
    void loadActiveViewers();

    if (!streamerLiveStreamId || viewerTrackingDisabled) return;

    const channel = supabase
      .channel(`active-viewers-mobile-${streamerLiveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${streamerLiveStreamId}`,
        },
        () => {
          void loadActiveViewers();
          void refreshViewerCount(streamerLiveStreamId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadActiveViewers, refreshViewerCount, showViewers, streamerLiveStreamId, viewerTrackingDisabled]);

  const { messages: chatMessages, loading: chatLoading, sendMessage: sendChatMessage, retryMessage: retryChatMessage } = useChatMessages({ liveStreamId: streamerLiveStreamId ?? undefined });

  useEffect(() => {
    if (!streamerLiveStreamId) return;
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [chatMessages.length, streamerLiveStreamId]);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getFallbackBubbleColor = (profileId: string) => {
    const colors = [
      'rgba(168, 85, 247, 0.28)',
      'rgba(236, 72, 153, 0.28)',
      'rgba(59, 130, 246, 0.28)',
      'rgba(99, 102, 241, 0.28)',
      'rgba(139, 92, 246, 0.28)',
      'rgba(217, 70, 239, 0.28)',
      'rgba(244, 63, 94, 0.28)',
      'rgba(34, 211, 238, 0.24)',
    ];
    let hash = 0;
    for (let i = 0; i < profileId.length; i++) {
      hash = profileId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const toHexWithAlpha = (hex: string, alphaHex: string) => {
    const raw = (hex || '').trim();
    if (!raw) return null;
    if (!raw.startsWith('#')) return null;
    const body = raw.slice(1);
    if (body.length !== 6) return null;
    return `#${body}${alphaHex}`;
  };

  const handleSendChat = useCallback(async () => {
    const trimmed = chatInputText.trim();
    if (!trimmed) return;
    if (!streamerLiveStreamId) return;

    const ok = await sendChatMessage(trimmed);
    if (ok) {
      setChatInputText('');
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [chatInputText, sendChatMessage, streamerLiveStreamId]);

  useEffect(() => {
    if (!showChatSettings) return;

    let cancelled = false;
    const loadSettings = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) return;

        const { data } = await supabase
          .from('chat_settings')
          .select('chat_bubble_color, chat_font')
          .eq('profile_id', userId)
          .maybeSingle();

        if (cancelled) return;
        if (data?.chat_bubble_color) setChatBubbleColor(data.chat_bubble_color);
        if (data?.chat_font) setChatFont(data.chat_font);
      } catch {
        // ignore
      }
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [showChatSettings]);

  const handleSaveChatSettings = useCallback(async () => {
    if (chatSaving) return;
    setChatSaving(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from('chat_settings')
        .upsert(
          {
            profile_id: userId,
            chat_bubble_color: chatBubbleColor,
            chat_font: chatFont,
          },
          {
            onConflict: 'profile_id',
          } as any
        );

      if (error) {
        Alert.alert('Save failed', error.message || 'Failed to save chat settings');
        return;
      }

      setShowChatSettings(false);
    } finally {
      setChatSaving(false);
    }
  }, [chatBubbleColor, chatFont, chatSaving]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={handleExit}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <View style={styles.headerRow}>
            {streamer?.avatar_url ? (
              <Image source={{ uri: streamer.avatar_url }} style={styles.streamerAvatar} />
            ) : (
              <View style={styles.streamerAvatarFallback} />
            )}
            <Text style={[styles.streamerName, { color: theme.colors.text }]} numberOfLines={1}>
              {headerDisplayName}
            </Text>
            <TouchableOpacity
              style={styles.viewerCountPill}
              onPress={() => setShowViewers(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.viewerCountText}>{viewerCount}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {headerStreamTitle}
          </Text>
          <View style={styles.rankRow}>
            <View style={styles.rankChip}>
              <Ionicons name="flame" size={14} color="#ff7b54" />
              <Text style={styles.rankChipText}>
                {trendingRank != null ? `#${trendingRank}` : '—'}
              </Text>
            </View>
            <View style={styles.rankChip}>
              <Ionicons name="trophy" size={14} color="#facc15" />
              <Text style={styles.rankChipText}>
                {leaderboardRank != null ? `#${leaderboardRank}` : '—'}
              </Text>
            </View>
          </View>
          {topGifters.length > 0 && (
            <View style={styles.topGiftersRow}>
              {topGifters.map((gifter) => (
                <View key={gifter.profile_id} style={styles.gifterBubble}>
                  {gifter.avatar_url ? (
                    <Image source={{ uri: gifter.avatar_url }} style={styles.gifterAvatar} />
                  ) : (
                    <View style={styles.gifterAvatarFallback} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowChatSettings(true)}
          >
            <Ionicons
              name="settings"
              size={22}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {loadingStreamer ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Loading stream...</Text>
          </View>
        ) : connectionError ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: theme.colors.text }]}>{connectionError}</Text>
          </View>
        ) : !isConnected ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Connecting to LiveKit...</Text>
          </View>
        ) : shouldShowWaiting ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Waiting for streamer to appear...</Text>
          </View>
        ) : tileParticipant ? (
          <View style={styles.viewerLayout}>
            <View style={styles.videoContainer}>
              <TileComponent
                item={{ id: tileParticipant.identity, participant: tileParticipant, isAutofill: false }}
                isEditMode={false}
                isFocused={false}
                isMinimized={false}
                room={room as any}
              />
            </View>

            <View style={styles.chatPanel}>
              <ScrollView
                ref={chatScrollRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatScrollContent}
              >
                {!streamerLiveStreamId ? (
                  <View style={styles.chatEmptyState}>
                    <Text style={styles.chatEmptyText}>Chat is unavailable</Text>
                  </View>
                ) : chatLoading ? (
                  <View style={styles.chatEmptyState}>
                    <ActivityIndicator color="#a855f7" />
                    <Text style={styles.chatEmptyText}>Loading chat…</Text>
                  </View>
                ) : chatMessages.length === 0 ? (
                  <View style={styles.chatEmptyState}>
                    <Text style={styles.chatEmptyText}>No messages yet</Text>
                  </View>
                ) : (
                  chatMessages.map((msg) => {
                    const isSystem = msg.profile_id == null || msg.message_type === 'system';
                    const bubbleColor = msg.profile_id
                      ? (toHexWithAlpha(msg.chat_bubble_color || '', '66') || getFallbackBubbleColor(msg.profile_id))
                      : 'rgba(0,0,0,0.2)';

                    if (isSystem) {
                      return (
                        <View key={msg.id} style={styles.systemMessageWrap}>
                          <Text style={styles.systemMessageText}>{msg.content}</Text>
                        </View>
                      );
                    }

                    return (
                      <View key={msg.id} style={styles.messageRow}>
                        <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
                          {chatShowAvatars ? (
                            <View style={styles.bubbleAvatarWrap}>
                              {msg.avatar_url ? (
                                <Image source={{ uri: msg.avatar_url }} style={styles.avatar} />
                              ) : (
                                <View style={styles.avatarFallback} />
                              )}
                            </View>
                          ) : null}

                          <View style={styles.bubbleContent}>
                            <View style={styles.bubbleHeaderRow}>
                              <Text
                                style={[
                                  styles.messageUsername,
                                  msg.chat_font ? { fontFamily: msg.chat_font } : null,
                                ]}
                                numberOfLines={1}
                              >
                                {msg.username || 'Unknown'}
                              </Text>
                              <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                              {msg.client_status === 'sending' && (
                                <Text style={styles.messageStatusSending}>Sending…</Text>
                              )}
                              {msg.client_status === 'failed' && (
                                <TouchableOpacity
                                  onPress={() => {
                                    if (typeof msg.id === 'string') {
                                      retryChatMessage(msg.id);
                                    }
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.messageStatusFailed}>Failed • Tap</Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            {typeof msg.gifter_level === 'number' && msg.gifter_level > 0 ? (
                              <View style={styles.levelRow}>
                                <View style={styles.levelPill}>
                                  <Text style={styles.levelPillText}>Lv {msg.gifter_level}</Text>
                                </View>
                                <Text
                                  style={[
                                    styles.messageTextInline,
                                    msg.chat_font ? { fontFamily: msg.chat_font } : null,
                                  ]}
                                >
                                  {msg.content}
                                </Text>
                              </View>
                            ) : (
                              <Text
                                style={[
                                  styles.messageText,
                                  msg.chat_font ? { fontFamily: msg.chat_font } : null,
                                ]}
                              >
                                {msg.content}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <LiveChatActionBar
                value={chatInputText}
                onChangeText={setChatInputText}
                onSubmit={handleSendChat}
                placeholder="Say something…"
                inputEnabled={!!streamerLiveStreamId}
                showGift={true}
                giftEnabled={giftingEnabled && hasSelectedStreamer}
                showComingSoon={!giftingEnabled}
                onGiftPress={() => setShowGifts(true)}
                showShare={true}
                onSharePress={handleShare}
                bottomInset={insets.bottom}
              />
            </View>
          </View>
        ) : (
          <View style={styles.centered}>
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Stream is offline.</Text>
          </View>
        )}
      </View>

      <Modal
        visible={showChatSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChatSettings(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.background }]} >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Chat Settings</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowChatSettings(false)}
              >
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Show avatars</Text>
                <Switch value={chatShowAvatars} onValueChange={setChatShowAvatars} />
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Bubble color</Text>
              <View style={styles.colorRow}>
                {['#a855f7', '#ec4899', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#06b6d4'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setChatBubbleColor(c)}
                    style={[styles.colorSwatch, { backgroundColor: c }, chatBubbleColor === c && styles.colorSwatchSelected]}
                    activeOpacity={0.8}
                  />
                ))}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Font</Text>
              <View style={styles.fontRow}>
                {['Inter', 'System', 'Roboto', 'Poppins'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.fontChip, chatFont === f && styles.fontChipSelected]}
                    onPress={() => setChatFont(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.fontChipText, { color: theme.colors.text }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowChatSettings(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, chatSaving && styles.modalButtonDisabled]}
                onPress={handleSaveChatSettings}
                disabled={chatSaving}
              >
                <Text style={styles.modalButtonTextPrimary}>{chatSaving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showViewers}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewers(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <View style={styles.viewersHeaderRow}>
                <Ionicons name="eye" size={18} color="#a855f7" />
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Viewers ({viewerCount})</Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowViewers(false)}
              >
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {viewerTrackingDisabled ? (
              <View style={styles.chatEmptyState}>
                <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Viewer tracking unavailable</Text>
                <Text style={[styles.chatEmptyText, { textAlign: 'center' }]}>This environment does not have combined viewer tracking enabled yet.</Text>
              </View>
            ) : activeViewersLoading ? (
              <View style={styles.chatEmptyState}>
                <ActivityIndicator color="#a855f7" />
                <Text style={styles.chatEmptyText}>Loading viewers…</Text>
              </View>
            ) : activeViewers.length === 0 ? (
              <View style={styles.chatEmptyState}>
                <Text style={styles.chatEmptyText}>No viewers yet</Text>
              </View>
            ) : (
              <ScrollView style={styles.viewersList} contentContainerStyle={styles.viewersListContent}>
                {activeViewers.map((v) => (
                  <View key={v.viewer_id} style={styles.viewerRow}>
                    {v.avatar_url ? (
                      <Image source={{ uri: String(v.avatar_url) }} style={styles.viewerAvatar} />
                    ) : (
                      <View style={styles.viewerAvatarFallback} />
                    )}
                    <View style={styles.viewerRowBody}>
                      <Text style={[styles.viewerName, { color: theme.colors.text }]} numberOfLines={1}>{v.username}</Text>
                      <Text style={styles.viewerSubtext} numberOfLines={1}>Watching now</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <GiftOverlay
        visible={showGifts}
        onClose={() => setShowGifts(false)}
        participants={visibleParticipantsForGiftOverlay}
        targetRecipientId={targetRecipientId}
        onSelectRecipientId={(id) => setTargetRecipientId(id)}
        liveStreamId={streamerLiveStreamId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  streamerAvatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  streamerName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  viewerCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  rankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rankChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  topGiftersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  gifterBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  gifterAvatar: {
    width: '100%',
    height: '100%',
  },
  gifterAvatarFallback: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
  },
  content: {
    flex: 1,
  },
  viewerLayout: {
    flex: 1,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: Math.max(220, Math.min(420, Math.round(SCREEN_HEIGHT * 0.46))),
    padding: 0,
  },
  chatPanel: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  chatEmptyState: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  chatEmptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  systemMessageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemMessageText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  messageRow: {
    width: '100%',
  },
  bubbleAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatar: {
    width: 30,
    height: 30,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bubble: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubbleContent: {
    flex: 1,
    minWidth: 0,
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  messageUsername: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  messageTime: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
  },
  messageStatusSending: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  messageStatusFailed: {
    color: 'rgba(244,63,94,0.95)',
    fontSize: 11,
    fontWeight: '800',
  },
  messageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  levelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  levelPillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
  },
  messageTextInline: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  chatInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.95)',
  },
  chatSendButtonDisabled: {
    opacity: 0.45,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  helperText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    paddingHorizontal: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  viewersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalSection: {
    marginTop: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  colorSwatchSelected: {
    borderColor: '#fff',
  },
  fontRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  fontChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  fontChipSelected: {
    borderColor: 'rgba(168, 85, 247, 0.95)',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  fontChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalButtonPrimary: {
    backgroundColor: 'rgba(168, 85, 247, 0.95)',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  viewersList: {
    maxHeight: 360,
  },
  viewersListContent: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewerRowBody: {
    flex: 1,
  },
  viewerName: {
    fontSize: 14,
    fontWeight: '800',
  },
  viewerSubtext: {
    marginTop: 2,
    color: 'rgba(16,185,129,0.95)',
    fontSize: 12,
    fontWeight: '700',
  },
});
