import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, Image, Alert, FlatList, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuth } from '../state/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { getAvatarSource, getAvatarUrl } from '../lib/defaultAvatar';
import { getTierByKey } from './live/ChatOverlay';
import MllProBadge from './shared/MllProBadge';

// ============================================================================
// CHAT CONTENT - Match web Chat.tsx exactly
// ============================================================================

interface ChatMessage {
  id: number | string;
  profile_id: string | null;
  username?: string;
  avatar_url?: string;
  is_live?: boolean;
  message_type: string;
  content: string;
  created_at: string;
  chat_bubble_color?: string;
  chat_font?: string;
  gifter_level?: number;
  total_spent?: number;
  is_mll_pro?: boolean;
}

type GifterStatusLite = {
  tier_key: string;
  level_in_tier: number;
};

export function ChatContent({ roomSlug }: { roomSlug?: string }) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const shouldAutoScrollRef = useRef(true);
  const initialScrollDoneRef = useRef(false);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatusLite>>({});
  const gifterStatusCacheRef = useRef<Record<string, GifterStatusLite>>({});
  
  // FIX #3: Profile cache to prevent repeated fetches for same user
  const profileCacheRef = useRef<Map<string, {
    username: string;
    avatar_url?: string;
    is_live?: boolean;
    gifter_level?: number;
    total_spent?: number;
    is_mll_pro?: boolean;
  }>>(new Map());
  const chatRoomId = roomSlug;

  const loadGifterStatuses = useCallback(async (profileIds: string[]) => {
    const unique = Array.from(new Set(profileIds.filter((id) => typeof id === 'string' && id.length > 0)));
    const missing = unique.filter((id) => !gifterStatusCacheRef.current[id]);
    if (missing.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/gifter-status/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileIds: missing }),
      });

      if (!response.ok) return;
      const json = await response.json();
      const statuses = (json?.statuses || {}) as Record<string, GifterStatusLite>;

      gifterStatusCacheRef.current = { ...gifterStatusCacheRef.current, ...statuses };
      setGifterStatusMap((prev) => ({ ...prev, ...statuses }));
    } catch {
      // ignore
    }
  }, [API_BASE_URL]);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
      initialScrollDoneRef.current = false;
      if (!chatRoomId) {
        console.error('[ROOM_CHAT] Missing chatRoomId - cannot load messages');
        setMessages([]);
        setInitialLoaded(false);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('chat_messages')
        .select(`
          id,
          profile_id,
          message_type,
          content,
          created_at,
          profiles (
            username,
            display_name,
            avatar_url,
            is_live,
            chat_bubble_color,
            chat_font,
            gifter_level,
            total_spent,
            is_mll_pro
          )
        `);

      // Apply scope filter
      query = query.eq('room_id', chatRoomId).is('live_stream_id', null);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const messagesWithProfiles = (data || []).map((msg: any) => {
        const profile = msg.profiles;
        
        // FIX #3: Populate cache with profiles from initial load
        if (msg.profile_id && profile) {
          profileCacheRef.current.set(msg.profile_id, {
            username: profile.display_name || profile.username || 'Unknown',
            avatar_url: profile.avatar_url,
            is_live: profile.is_live || false,
            gifter_level: profile.gifter_level || 0,
            total_spent: profile.total_spent || 0,
            is_mll_pro: profile.is_mll_pro || false,
          });
        }
        
        return {
          id: msg.id,
          profile_id: msg.profile_id,
          username: profile?.display_name || profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
          is_live: profile?.is_live || false,
          message_type: msg.message_type,
          content: msg.content,
          created_at: msg.created_at,
          chat_bubble_color: profile?.chat_bubble_color,
          chat_font: profile?.chat_font,
          gifter_level: profile?.gifter_level || 0,
          total_spent: profile?.total_spent || 0,
          is_mll_pro: profile?.is_mll_pro || false,
        };
      });

      const profileIds = messagesWithProfiles
        .map((msg) => msg.profile_id)
        .filter((id): id is string => typeof id === 'string');
      void loadGifterStatuses(profileIds);

      setMessages(messagesWithProfiles);
      setInitialLoaded(true);
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [chatRoomId, supabase]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!chatRoomId) {
      return;
    }

    const channel = supabase
      .channel(`room-chat:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${chatRoomId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new;
          
          // FIX #3: Check cache first before fetching profile
          const cachedProfile = profileCacheRef.current.get(newMsg.profile_id);
          
          const appendMessage = (nextMsg: ChatMessage) => {
            setMessages((prev) => {
              if (prev.some((msg) => String(msg.id) === String(nextMsg.id))) {
                return prev;
              }
              return [nextMsg, ...prev];
            });
          };

          if (cachedProfile) {
            // Use cached profile - NO NETWORK CALL
            appendMessage({
              id: newMsg.id,
              profile_id: newMsg.profile_id,
              username: cachedProfile.username,
              avatar_url: cachedProfile.avatar_url,
              is_live: cachedProfile.is_live || false,
              message_type: newMsg.message_type,
              content: newMsg.content,
              created_at: newMsg.created_at,
              gifter_level: cachedProfile.gifter_level || 0,
              total_spent: cachedProfile.total_spent || 0,
              is_mll_pro: cachedProfile.is_mll_pro || false,
            });
            if (newMsg.profile_id) {
              void loadGifterStatuses([newMsg.profile_id]);
            }
          } else {
            // Cache miss - fetch and cache profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url, is_live, gifter_level, total_spent, is_mll_pro')
              .eq('id', newMsg.profile_id)
              .single();
              
            if (profile) {
              // Cache the profile
              profileCacheRef.current.set(newMsg.profile_id, {
                username: profile.display_name || profile.username || 'Unknown',
                avatar_url: profile.avatar_url,
                is_live: profile.is_live || false,
                gifter_level: profile.gifter_level || 0,
                total_spent: profile.total_spent || 0,
                is_mll_pro: profile.is_mll_pro || false,
              });
              
              appendMessage({
                id: newMsg.id,
                profile_id: newMsg.profile_id,
                username: profile.username || 'Unknown',
                avatar_url: profile.avatar_url,
                is_live: profile.is_live || false,
                message_type: newMsg.message_type,
                content: newMsg.content,
                created_at: newMsg.created_at,
                gifter_level: profile.gifter_level || 0,
                total_spent: profile.total_spent || 0,
                is_mll_pro: profile.is_mll_pro || false,
              });
              if (newMsg.profile_id) {
                void loadGifterStatuses([newMsg.profile_id]);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, supabase]);

  useEffect(() => {
    if (!initialLoaded) return;
    if (initialScrollDoneRef.current) return;
    InteractionManager.runAfterInteractions(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      initialScrollDoneRef.current = true;
    });
  }, [initialLoaded]);

  useEffect(() => {
    if (!initialLoaded) return;
    if (!shouldAutoScrollRef.current) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [initialLoaded, messages.length]);

  const sendMessage = async () => {
    const messageToSend = newMessage.trim();
    if (!messageToSend || !user) return;
    if (!chatRoomId) {
      console.error('[ROOM_CHAT] Missing chatRoomId - cannot send message');
      return;
    }

    try {
      setNewMessage('');
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: chatRoomId,
          profile_id: user.id,
          content: messageToSend,
          message_type: 'text',
        });

      if (error) throw error;
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  if (!chatRoomId) {
    return (
      <View style={styles.chatDisabled}>
        <Text style={styles.noDataText}>Chat unavailable for this room.</Text>
      </View>
    );
  }

  return (
    <View style={styles.chatContainer}>
      <FlatList
        ref={listRef}
        data={messages}
        inverted={true}
        style={styles.chatMessages}
        contentContainerStyle={user ? styles.chatMessagesContentWithInput : styles.chatMessagesContent}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          shouldAutoScrollRef.current = contentOffset.y < 60;
        }}
        onLayout={() => {
          if (!initialLoaded) return;
          if (initialScrollDoneRef.current) return;
          InteractionManager.runAfterInteractions(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
            initialScrollDoneRef.current = true;
          });
        }}
        onContentSizeChange={() => {
          if (!initialLoaded) return;
          if (!shouldAutoScrollRef.current) return;
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          });
        }}
        renderItem={({ item: msg }) => (
          <View style={styles.chatMessage}>
            <Image
              source={getAvatarSource(msg.avatar_url)}
              style={styles.chatAvatar}
            />
            <View style={styles.chatMessageContent}>
              <View style={styles.chatMessageHeader}>
                <Text style={[styles.chatUsername, msg.is_live && styles.chatUsernameLive]}>
                  {msg.username}
                </Text>
                {msg.is_mll_pro ? <MllProBadge size="md" /> : null}
                {(() => {
                  const profileId = msg.profile_id;
                  if (!profileId) return null;
                  const status = gifterStatusMap[profileId];
                  if (!status) return null;
                  const tier = getTierByKey(status.tier_key);
                  if (!tier) return null;
                  return (
                    <View style={[
                      styles.gifterBadgePill,
                      { backgroundColor: `${tier.color}30`, borderColor: `${tier.color}60` }
                    ]}>
                      <Text style={styles.gifterBadgeIcon}>{tier.icon}</Text>
                      <Text style={[styles.gifterBadgeLevel, { color: tier.color }]}>
                        {status.level_in_tier}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={styles.chatMessageText}>{msg.content}</Text>
            </View>
          </View>
        )}
      />
      
      {user && (
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={true}
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.chatSendButton}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={20} color={newMessage.trim() ? '#4a90d9' : '#666'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// USER STATS CONTENT - Match web UserStatsSection.tsx exactly
// ============================================================================

export function StatsContent({
  liveStreamId,
  roomId,
  sessionStartedAt,
}: {
  liveStreamId?: number | null;
  roomId?: string | null;
  sessionStartedAt?: string | null;
}) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [stats, setStats] = useState({
    coinBalance: 0,
    diamondBalance: 0,
    username: '',
    avatarUrl: '',
    gifterLevel: 0,
  });
  const [sessionStats, setSessionStats] = useState({
    startedAt: null as string | null,
    viewerCount: 0,
    likesCount: 0,
    diamondsEarned: 0,
    elapsedSeconds: 0,
  });
  const [roomViewerCount, setRoomViewerCount] = useState(0);
  const [resolvedLiveStreamId, setResolvedLiveStreamId] = useState<number | null>(liveStreamId ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, [user]);

  useEffect(() => {
    setResolvedLiveStreamId(liveStreamId ?? null);
  }, [liveStreamId]);

  useEffect(() => {
    if (!roomId) {
      setRoomViewerCount(0);
      return;
    }

    let cancelled = false;
    const loadRoomViewerCount = async () => {
      const { data } = await supabase.rpc('get_room_presence_count_minus_self', {
        p_room_id: roomId,
      });
      if (!cancelled) {
        setRoomViewerCount(Number(data ?? 0));
      }
    };

    loadRoomViewerCount();
    const interval = setInterval(loadRoomViewerCount, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, supabase]);

  useEffect(() => {
    if (liveStreamId || !user) return;
    let cancelled = false;

    const resolveLiveStream = async () => {
      const { data } = await supabase
        .from('live_streams')
        .select('id')
        .eq('profile_id', user.id)
        .eq('live_available', true)
        .eq('streaming_mode', 'group')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setResolvedLiveStreamId((data as any)?.id ?? null);
      }
    };

    resolveLiveStream();
    const interval = setInterval(resolveLiveStream, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [liveStreamId, user, supabase]);

  // Real-time subscription for balance updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-balance-updates:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          const updatedProfile = payload.new;
          setStats(prev => ({
            ...prev,
            coinBalance: updatedProfile.coin_balance || 0,
            diamondBalance: updatedProfile.earnings_balance || 0,
            gifterLevel: updatedProfile.gifter_level || 0,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadUserStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, coin_balance, earnings_balance, gifter_level')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setStats({
        coinBalance: data.coin_balance || 0,
        diamondBalance: data.earnings_balance || 0,
        username: data.display_name || data.username || '',
        avatarUrl: data.avatar_url || '',
        gifterLevel: data.gifter_level || 0,
      });
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const loadSessionStats = useCallback(async () => {
    if (!resolvedLiveStreamId) {
      setSessionStats({
        startedAt: sessionStartedAt ?? null,
        viewerCount: 0,
        likesCount: 0,
        diamondsEarned: 0,
        elapsedSeconds: sessionStartedAt
          ? Math.max(0, Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000))
          : 0,
      });
      return;
    }

    const { data: stream } = await supabase
      .from('live_streams')
      .select('started_at, created_at, viewer_count')
      .eq('id', resolvedLiveStreamId)
      .maybeSingle();

    const startedAt =
      (stream as any)?.started_at ??
      (stream as any)?.created_at ??
      sessionStartedAt ??
      null;
    const viewerCount = Number((stream as any)?.viewer_count ?? 0);

    const { count: likesCount } = await supabase
      .from('stream_likes')
      .select('id', { count: 'exact', head: true })
      .eq('live_stream_id', resolvedLiveStreamId);

    const { data: gifts } = await supabase
      .from('gifts')
      .select('diamonds_awarded')
      .eq('live_stream_id', resolvedLiveStreamId);

    const diamondsEarned = (gifts || []).reduce((sum, g) => sum + Number(g?.diamonds_awarded ?? 0), 0);

    const elapsedSeconds = startedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
      : 0;

    setSessionStats({
      startedAt,
      viewerCount,
      likesCount: likesCount ?? 0,
      diamondsEarned,
      elapsedSeconds,
    });
  }, [resolvedLiveStreamId, sessionStartedAt, supabase]);

  useEffect(() => {
    loadSessionStats();
  }, [loadSessionStats]);

  useEffect(() => {
    if (!resolvedLiveStreamId) return;
    const interval = setInterval(() => {
      loadSessionStats();
    }, 20000);
    return () => clearInterval(interval);
  }, [resolvedLiveStreamId, loadSessionStats]);

  useEffect(() => {
    if (!sessionStats.startedAt) return;
    const interval = setInterval(() => {
      setSessionStats(prev => ({
        ...prev,
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(prev.startedAt!).getTime()) / 1000)),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStats.startedAt]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const mm = mins % 60;
    const ss = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mm}m`;
    if (mins > 0) return `${mins}m ${ss}s`;
    return `${ss}s`;
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.statsContainer}>
        <Text style={styles.noDataText}>Sign in to view your stats</Text>
      </View>
    );
  }

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Your Stats</Text>
      
      {/* User Info */}
      <View style={styles.statsUserInfo}>
        <Image
          source={{ uri: stats.avatarUrl || getAvatarUrl(stats.username) }}
          style={styles.statsAvatar}
        />
        <View style={styles.statsUserText}>
          <Text style={styles.statsUsername}>{stats.username}</Text>
          {stats.gifterLevel > 0 && (
            <Text style={styles.statsGifterLevel}>Gifter Level {stats.gifterLevel}</Text>
          )}
        </View>
      </View>

      {/* Balances */}
      <View style={styles.statsBalances}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.coinBalance}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
        <View style={styles.statItemDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.diamondBalance}</Text>
          <Text style={styles.statLabel}>Diamonds</Text>
        </View>
      </View>

      <View style={styles.sessionStatsContainer}>
        <Text style={styles.sessionStatsTitle}>Session Stats</Text>
        <Text style={styles.sessionStatsDebugText}>
          Room: {roomId || 'none'} • Stream: {resolvedLiveStreamId ?? 'none'} • Started:{' '}
          {sessionStats.startedAt || 'none'}
        </Text>
        {!resolvedLiveStreamId && !roomId ? (
          <Text style={styles.sessionStatsEmptyText}>Go live to see session stats.</Text>
        ) : (
          <View style={styles.sessionStatsGrid}>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatValue}>{formatDuration(sessionStats.elapsedSeconds)}</Text>
              <Text style={styles.sessionStatLabel}>Time Live</Text>
            </View>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatValue}>{sessionStats.diamondsEarned}</Text>
              <Text style={styles.sessionStatLabel}>Earnings</Text>
            </View>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatValue}>
                {roomId ? roomViewerCount : sessionStats.viewerCount}
              </Text>
              <Text style={styles.sessionStatLabel}>Views</Text>
            </View>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatValue}>{sessionStats.likesCount}</Text>
              <Text style={styles.sessionStatLabel}>Likes</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// LEADERBOARD CONTENT - Match web Leaderboard.tsx exactly
// ============================================================================

interface LeaderboardEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  is_live?: boolean;
  rank: number;
  metric_value: number;
  is_mll_pro?: boolean;
}

type LeaderboardType = 'top_streamers' | 'top_gifters';
type Period = 'daily' | 'weekly' | 'monthly' | 'alltime';
type LeaderboardScope = 'room' | 'global';

export function LeaderboardContent({ roomSlug, roomName }: { roomSlug?: string; roomName?: string }) {
  const supabase = getSupabaseClient();
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com';
  const [type, setType] = useState<LeaderboardType>('top_streamers');
  const [period, setPeriod] = useState<Period>('daily');
  const [scope, setScope] = useState<LeaderboardScope>(roomSlug ? 'room' : 'global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatusLite>>({});
  const gifterStatusCacheRef = useRef<Record<string, GifterStatusLite>>({});

  useEffect(() => {
    setScope(roomSlug ? 'room' : 'global');
  }, [roomSlug]);

  useEffect(() => {
    loadLeaderboard();
  }, [type, period, scope, roomSlug]);

  useEffect(() => {
    let reloadTimer: NodeJS.Timeout | null = null;

    const debouncedReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadLeaderboard(false);
      }, 1000);
    };

    const entryTypeFilter =
      type === 'top_streamers'
        ? 'entry_type=like.diamond_earn%'
        : 'entry_type=like.coin_spend%';

    const ledgerChannel = supabase
      .channel('leaderboard-ledger-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_entries',
          filter: entryTypeFilter,
        },
        () => {
          debouncedReload();
        }
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(ledgerChannel);
    };
  }, [type, period, scope, roomSlug, supabase]);

  const loadGifterStatuses = useCallback(async (profileIds: string[]) => {
    const unique = Array.from(new Set(profileIds.filter((id) => typeof id === 'string' && id.length > 0)));
    const missing = unique.filter((id) => !gifterStatusCacheRef.current[id]);
    if (missing.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/gifter-status/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileIds: missing }),
      });

      if (!response.ok) return;
      const json = await response.json();
      const statuses = (json?.statuses || {}) as Record<string, GifterStatusLite>;

      gifterStatusCacheRef.current = { ...gifterStatusCacheRef.current, ...statuses };
      setGifterStatusMap((prev) => ({ ...prev, ...statuses }));
    } catch {
      // ignore
    }
  }, [API_BASE_URL]);

  const loadLeaderboard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const roomIdParam = scope === 'room' ? roomSlug : null;
      const roomIdParams =
        scope === 'room' && roomSlug === 'live-central'
          ? ['live-central', 'live_central']
          : (roomIdParam ? [roomIdParam] : [null]);

      const results = await Promise.all(
        roomIdParams.map((rid) =>
          supabase.rpc('get_leaderboard', {
            p_type: type,
            p_period: period,
            p_limit: 100,
            p_room_id: rid,
          })
        )
      );

      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        throw firstError;
      }

      const combinedRows = results.flatMap((r) => (Array.isArray(r.data) ? (r.data as any[]) : []));

      const mergedByProfile = new Map<string, any>();
      for (const row of combinedRows) {
        const key = String(row.profile_id);
        const prev = mergedByProfile.get(key);
        const nextMetric = Number(row.metric_value ?? 0);
        if (!prev) {
          mergedByProfile.set(key, {
            ...row,
            metric_value: nextMetric,
          });
        } else {
          mergedByProfile.set(key, {
            ...prev,
            metric_value: Number(prev.metric_value ?? 0) + nextMetric,
            username: prev.username || row.username,
            avatar_url: prev.avatar_url || row.avatar_url,
            is_live: Boolean(prev.is_live || row.is_live),
            gifter_level: Math.max(Number(prev.gifter_level ?? 0), Number(row.gifter_level ?? 0)),
          });
        }
      }

      const mapped = Array.from(mergedByProfile.values())
        .map((row: any) => ({
          profile_id: row.profile_id,
          username: row.username,
          avatar_url: row.avatar_url,
          is_live: Boolean(row.is_live ?? false),
          metric_value: Number(row.metric_value ?? 0),
          rank: 0,
          is_mll_pro: row.is_mll_pro || false,
        }))
        .filter((entry: any) => Number(entry.metric_value ?? 0) > 0)
        .sort((a: any, b: any) => Number(b.metric_value ?? 0) - Number(a.metric_value ?? 0))
        .map((entry: any, idx: number) => ({ ...entry, rank: idx + 1 }));

      setEntries(mapped);

      if (mapped.length > 0) {
        await loadGifterStatuses(mapped.map((e: any) => e.profile_id));
      }
    } catch (error) {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const formatMetric = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  return (
    <View style={styles.leaderboardContainer}>
      <Text style={styles.leaderboardHeader}>Leaderboards</Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, type === 'top_streamers' && styles.toggleButtonActive]}
          onPress={() => setType('top_streamers')}
        >
          <Text style={[styles.toggleButtonText, type === 'top_streamers' && styles.toggleButtonTextActive]}>
            Streamers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, type === 'top_gifters' && styles.toggleButtonActive]}
          onPress={() => setType('top_gifters')}
        >
          <Text style={[styles.toggleButtonText, type === 'top_gifters' && styles.toggleButtonTextActive]}>
            Gifters
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        {(['daily', 'weekly', 'monthly', 'alltime'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.toggleButtonSmall, period === p && styles.toggleButtonSmallActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.toggleButtonSmallText, period === p && styles.toggleButtonSmallTextActive]}>
              {p === 'alltime' ? 'All-Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {roomSlug && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButtonSmall, scope === 'room' && styles.toggleButtonSmallActive]}
            onPress={() => setScope('room')}
          >
            <Text style={[styles.toggleButtonSmallText, scope === 'room' && styles.toggleButtonSmallTextActive]}>
              {roomName || 'Room'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButtonSmall, scope === 'global' && styles.toggleButtonSmallActive]}
            onPress={() => setScope('global')}
          >
            <Text style={[styles.toggleButtonSmallText, scope === 'global' && styles.toggleButtonSmallTextActive]}>
              Global
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No entries yet. Be the first!</Text>
        </View>
      ) : (
        <ScrollView style={styles.leaderboardList}>
          {entries.map((entry) => {
            const gifterStatus = entry.profile_id ? gifterStatusMap[entry.profile_id] : undefined;
            const tier = gifterStatus ? getTierByKey(gifterStatus.tier_key) : undefined;
            const showGifterBadge = !!gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0;
            const tierColor = gifterStatus?.tier_color || tier?.color || '#ffffff';
            const tierIcon = gifterStatus?.tier_icon || tier?.icon || '';

            return (
              <View key={entry.profile_id} style={styles.leaderboardEntry}>
                <Text style={[
                  styles.leaderboardRank,
                  entry.rank === 1 && styles.leaderboardRankGold,
                  entry.rank === 2 && styles.leaderboardRankSilver,
                  entry.rank === 3 && styles.leaderboardRankBronze,
                ]}>
                  #{entry.rank}
                </Text>
                <Image
                  source={{ uri: entry.avatar_url || getAvatarUrl(entry.username) }}
                  style={styles.leaderboardAvatar}
                />
                <View style={styles.leaderboardUserInfo}>
                  <View style={styles.leaderboardNameRow}>
                    <Text style={styles.leaderboardUsername}>{entry.username}</Text>
                    <View style={styles.leaderboardBadges}>
                      {entry.is_mll_pro ? (
                        <View style={styles.badgeItem}>
                          <MllProBadge size="sm" />
                        </View>
                      ) : null}
                      {showGifterBadge && tierIcon ? (
                        <View style={[styles.gifterBadgePill, styles.badgeItem, { backgroundColor: `${tierColor}30`, borderColor: `${tierColor}60` }]}>
                          <Text style={styles.gifterBadgeIcon}>{tierIcon}</Text>
                          <Text style={[styles.gifterBadgeLevel, { color: tierColor }]}>
                            {gifterStatus?.level_in_tier}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <Text style={styles.leaderboardValue}>
                  {formatMetric(entry.metric_value)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ============================================================================
// VIEWERS CONTENT - Room Presence List
// ============================================================================

type ViewerEntry = {
  profile_id: string;
  username?: string | null;
  last_seen_at?: string | null;
  is_live_available?: boolean | null;
  profiles?: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export function ViewersContent({ roomId }: { roomId?: string | null }) {
  const supabase = getSupabaseClient();
  const [viewers, setViewers] = useState<ViewerEntry[]>([]);
  const [liveMap, setLiveMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadViewers = useCallback(async () => {
    if (!roomId) {
      setViewers([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('room_presence')
        .select('profile_id, username, last_seen_at, is_live_available, profiles (username, display_name, avatar_url)')
        .eq('room_id', roomId)
        .order('last_seen_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setViewers((data as ViewerEntry[]) || []);
    } catch {
      setViewers([]);
    } finally {
      setLoading(false);
    }
  }, [roomId, supabase]);

  const loadLiveMap = useCallback(async (profileIds: string[]) => {
    const ids = Array.from(new Set(profileIds.filter(Boolean)));
    if (ids.length === 0) {
      setLiveMap({});
      return;
    }

    const { data } = await supabase
      .from('live_streams')
      .select('profile_id')
      .in('profile_id', ids)
      .eq('live_available', true);

    const map: Record<string, boolean> = {};
    (data || []).forEach((row: any) => {
      if (row?.profile_id) {
        map[row.profile_id] = true;
      }
    });
    setLiveMap(map);
  }, [supabase]);

  useEffect(() => {
    loadViewers();
  }, [loadViewers]);

  useEffect(() => {
    const ids = viewers.map(v => v.profile_id).filter(Boolean);
    loadLiveMap(ids);
  }, [viewers, loadLiveMap]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-presence:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_presence',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          loadViewers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase, loadViewers]);

  const renderViewer = ({ item }: { item: ViewerEntry }) => {
    const name = item.profiles?.display_name || item.profiles?.username || item.username || 'User';
    const avatarUrl = item.profiles?.avatar_url || undefined;
    const isLive = !!liveMap[item.profile_id] || !!item.is_live_available;
    const lastSeen = item.last_seen_at ? new Date(item.last_seen_at).getTime() : 0;
    const isActive = lastSeen > 0 && Date.now() - lastSeen < 60_000;
    return (
      <View style={styles.viewerRow}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.viewerAvatar} />
        ) : (
          <View style={styles.viewerAvatarFallback}>
            <Text style={styles.viewerAvatarText}>{name[0]?.toUpperCase() || 'U'}</Text>
          </View>
        )}
        <View style={styles.viewerInfo}>
          <View style={styles.viewerNameRow}>
            <Text style={styles.viewerName}>{name}</Text>
            {isActive ? <View style={styles.viewerActiveDot} /> : null}
            {isLive ? <Ionicons name="videocam" size={14} color="#ef4444" /> : null}
          </View>
          {item.profiles?.username ? (
            <Text style={styles.viewerUsername}>@{item.profiles.username}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  const sortedViewers = [...viewers].sort((a, b) => {
    const aLast = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
    const bLast = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
    const aActive = aLast > 0 && Date.now() - aLast < 60_000;
    const bActive = bLast > 0 && Date.now() - bLast < 60_000;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return bLast - aLast;
  });

  return (
    <View style={styles.viewersContainer}>
      {viewers.length === 0 ? (
        <Text style={styles.noDataText}>No viewers yet</Text>
      ) : (
        <FlatList
          data={sortedViewers}
          keyExtractor={(item) => `${item.profile_id}-${item.last_seen_at || ''}`}
          renderItem={renderViewer}
          contentContainerStyle={styles.viewerList}
        />
      )}
    </View>
  );
}

// ============================================================================
// OPTIONS CONTENT - Match web OptionsMenu.tsx
// ============================================================================

export function OptionsContent() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const navigation = useNavigation<NavigationProp<any>>();
  const [muteAll, setMuteAll] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  return (
    <View style={styles.optionsContainer}>
      <Text style={styles.optionsTitle}>Room Options</Text>
      
      {/* Mute All */}
      <TouchableOpacity
        style={styles.optionItem}
        onPress={() => setMuteAll(!muteAll)}
      >
        <View style={styles.optionLeft}>
          <Ionicons name={muteAll ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
          <Text style={styles.optionLabel}>Mute All Tiles</Text>
        </View>
        <View style={[styles.optionToggle, muteAll && styles.optionToggleActive]}>
          <View style={[styles.optionToggleKnob, muteAll && styles.optionToggleKnobActive]} />
        </View>
      </TouchableOpacity>

      {/* Autoplay */}
      <TouchableOpacity
        style={styles.optionItem}
        onPress={() => setAutoplay(!autoplay)}
      >
        <View style={styles.optionLeft}>
          <Ionicons name="play-circle" size={24} color="#fff" />
          <Text style={styles.optionLabel}>Autoplay Videos</Text>
        </View>
        <View style={[styles.optionToggle, autoplay && styles.optionToggleActive]}>
          <View style={[styles.optionToggleKnob, autoplay && styles.optionToggleKnobActive]} />
        </View>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.optionDivider} />

      {/* Wallet */}
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate('Wallet')}
      >
        <Ionicons name="wallet-outline" size={20} color="#fff" />
        <Text style={styles.optionButtonText}>Wallet</Text>
      </TouchableOpacity>

      {/* Room Rules */}
      <TouchableOpacity style={styles.optionButton}>
        <Ionicons name="document-text" size={20} color="#fff" />
        <Text style={styles.optionButtonText}>Room Rules</Text>
      </TouchableOpacity>

      {/* Help & FAQ */}
      <TouchableOpacity style={styles.optionButton}>
        <Ionicons name="help-circle" size={20} color="#fff" />
        <Text style={styles.optionButtonText}>Help & FAQ</Text>
      </TouchableOpacity>

      {/* Report Issue */}
      <TouchableOpacity style={styles.optionButton}>
        <Ionicons name="flag" size={20} color="#fff" />
        <Text style={styles.optionButtonText}>Report Issue</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// GIFT CONTENT - Will implement properly with recipient selection
// ============================================================================

export function GiftContent() {
  return (
    <View style={styles.optionsContainer}>
      <Text style={styles.noDataText}>Tap on a video tile to send a gift</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Chat styles
  chatContainer: {
    flex: 1,
    minHeight: 0,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 12,
  },
  chatMessagesContentWithInput: {
    padding: 12,
    paddingBottom: 56,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  chatMessageContent: {
    flex: 1,
  },
  chatMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatUsername: {
    color: '#4a90d9',
    fontWeight: '600',
    marginRight: 6,
  },
  chatUsernameLive: {
    color: '#ff6b6b',
  },
  chatBadge: {
    backgroundColor: '#4a90d9',
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gifterBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 4,
    gap: 2,
  },
  gifterBadgeIcon: {
    fontSize: 9,
  },
  gifterBadgeLevel: {
    fontSize: 12,
    fontWeight: '700',
  },
  chatMessageText: {
    color: '#fff',
    flexWrap: 'wrap',
  },
  chatInputContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
    flexShrink: 0,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 140,
    textAlignVertical: 'top',
  },
  chatSendButton: {
    padding: 8,
  },
  chatDisabled: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats styles
  statsContainer: {
    padding: 20,
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  statsUserText: {
    flex: 1,
  },
  statsUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGifterLevel: {
    color: '#4a90d9',
    fontSize: 12,
    marginTop: 2,
  },
  statsBalances: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
  },
  sessionStatsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  sessionStatsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  sessionStatsEmptyText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  sessionStatsDebugText: {
    color: '#6b7280',
    fontSize: 10,
    marginBottom: 6,
  },
  sessionStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  sessionStatItem: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
  },
  sessionStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sessionStatLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  // Viewers styles
  viewersContainer: {
    padding: 16,
    flex: 1,
  },
  viewerList: {
    paddingBottom: 12,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  viewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  viewerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  viewerInfo: {
    flex: 1,
  },
  viewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerUsername: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  viewerActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a855f7',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  statValue: {
    color: '#4a90d9',
    fontSize: 24,
    fontWeight: '600',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },

  // Leaderboard styles
  leaderboardContainer: {
    flex: 1,
    minHeight: 400,
  },
  leaderboardHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4a90d9',
  },
  toggleButtonText: {
    color: '#cbd5f5',
    fontWeight: '700',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  toggleButtonSmall: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonSmallActive: {
    backgroundColor: '#3b82f6',
  },
  toggleButtonSmallText: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleButtonSmallTextActive: {
    color: '#fff',
  },
  leaderboardList: {
    flex: 1,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  leaderboardRank: {
    color: '#4a90d9',
    fontWeight: '600',
    width: 40,
  },
  leaderboardRankGold: {
    color: '#FFD700',
  },
  leaderboardRankSilver: {
    color: '#C0C0C0',
  },
  leaderboardRankBronze: {
    color: '#CD7F32',
  },
  leaderboardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  leaderboardUserInfo: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
  },
  leaderboardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaderboardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeItem: {
    marginRight: 6,
  },
  leaderboardUsername: {
    color: '#fff',
    fontWeight: '600',
    maxWidth: '70%',
  },
  leaderboardBadge: {
    backgroundColor: '#4a90d9',
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderboardValue: {
    color: '#888',
  },

  // Options styles
  optionsContainer: {
    padding: 20,
  },
  optionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  optionToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    padding: 2,
  },
  optionToggleActive: {
    backgroundColor: '#4a90d9',
  },
  optionToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  optionToggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
});
