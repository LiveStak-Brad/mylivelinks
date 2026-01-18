import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../state/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { getAvatarSource } from '../lib/defaultAvatar';

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
}

export function ChatContent({ roomSlug }: { roomSlug: string }) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // FIX #3: Profile cache to prevent repeated fetches for same user
  const profileCacheRef = useRef<Map<string, {
    username: string;
    avatar_url?: string;
    is_live?: boolean;
    gifter_level?: number;
  }>>(new Map());

  // CRITICAL: Normalize room_id to use underscores (matches room_presence canonical format)
  const normalizedRoomId = roomSlug === 'live-central' ? 'live_central' : roomSlug;

  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
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
            avatar_url,
            is_live,
            chat_bubble_color,
            chat_font,
            gifter_level
          )
        `);

      // Apply scope filter
      query = query.eq('room_id', normalizedRoomId).is('live_stream_id', null);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const messagesWithProfiles = (data || []).map((msg: any) => {
        const profile = msg.profiles;
        
        // FIX #3: Populate cache with profiles from initial load
        if (msg.profile_id && profile) {
          profileCacheRef.current.set(msg.profile_id, {
            username: profile.username || 'Unknown',
            avatar_url: profile.avatar_url,
            is_live: profile.is_live || false,
            gifter_level: profile.gifter_level || 0,
          });
        }
        
        return {
          id: msg.id,
          profile_id: msg.profile_id,
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
          is_live: profile?.is_live || false,
          message_type: msg.message_type,
          content: msg.content,
          created_at: msg.created_at,
          chat_bubble_color: profile?.chat_bubble_color,
          chat_font: profile?.chat_font,
          gifter_level: profile?.gifter_level || 0,
        };
      });

      const ordered = [...messagesWithProfiles].reverse();
      setMessages(ordered);

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('[Chat] Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [normalizedRoomId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`room-chat-${normalizedRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${normalizedRoomId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new;
          
          // FIX #3: Check cache first before fetching profile
          const cachedProfile = profileCacheRef.current.get(newMsg.profile_id);
          
          if (cachedProfile) {
            // Use cached profile - NO NETWORK CALL
            console.log('[Chat] ✅ CACHE HIT: Using cached profile for', cachedProfile.username);
            setMessages((prev) => [...prev, {
              id: newMsg.id,
              profile_id: newMsg.profile_id,
              username: cachedProfile.username,
              avatar_url: cachedProfile.avatar_url,
              is_live: cachedProfile.is_live || false,
              message_type: newMsg.message_type,
              content: newMsg.content,
              created_at: newMsg.created_at,
              gifter_level: cachedProfile.gifter_level || 0,
            }]);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
          } else {
            // Cache miss - fetch and cache profile
            console.log('[Chat] ⚠️  CACHE MISS: Fetching profile for', newMsg.profile_id);
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url, is_live, gifter_level')
              .eq('id', newMsg.profile_id)
              .single();
              
            if (profile) {
              // Cache the profile
              profileCacheRef.current.set(newMsg.profile_id, {
                username: profile.username || 'Unknown',
                avatar_url: profile.avatar_url,
                is_live: profile.is_live || false,
                gifter_level: profile.gifter_level || 0,
              });
              
              setMessages((prev) => [...prev, {
                id: newMsg.id,
                profile_id: newMsg.profile_id,
                username: profile.username || 'Unknown',
                avatar_url: profile.avatar_url,
                is_live: profile.is_live || false,
                message_type: newMsg.message_type,
                content: newMsg.content,
                created_at: newMsg.created_at,
                gifter_level: profile.gifter_level || 0,
              }]);
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizedRoomId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: normalizedRoomId,
          profile_id: user.id,
          content: newMessage.trim(),
          message_type: 'text',
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
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

  return (
    <View style={styles.chatContainer}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatMessages}
        contentContainerStyle={styles.chatMessagesContent}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={styles.chatMessage}>
            <Image
              source={getAvatarSource(msg.avatar_url)}
              style={styles.chatAvatar}
            />
            <View style={styles.chatMessageContent}>
              <View style={styles.chatMessageHeader}>
                <Text style={[styles.chatUsername, msg.is_live && styles.chatUsernameLive]}>
                  {msg.username}
                </Text>
                {msg.gifter_level && msg.gifter_level > 0 && (
                  <Text style={styles.chatBadge}>L{msg.gifter_level}</Text>
                )}
              </View>
              <Text style={styles.chatMessageText}>{msg.content}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      
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
            multiline
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

export function StatsContent() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [stats, setStats] = useState({
    coinBalance: 0,
    diamondBalance: 0,
    username: '',
    avatarUrl: '',
    gifterLevel: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, [user]);

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
        .select('username, avatar_url, coin_balance, earnings_balance, gifter_level')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setStats({
        coinBalance: data.coin_balance || 0,
        diamondBalance: data.earnings_balance || 0,
        username: data.username || '',
        avatarUrl: data.avatar_url || '',
        gifterLevel: data.gifter_level || 0,
      });
    } catch (error) {
      console.error('[Stats] Failed to load user stats:', error);
    } finally {
      setLoading(false);
    }
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
  rank: number;
  metric_value: number;
  gifter_level?: number;
}

export function LeaderboardContent() {
  const supabase = getSupabaseClient();
  const [type, setType] = useState<'top_streamers' | 'top_gifters'>('top_streamers');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'alltime'>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [type, period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const leaderboardKey = `${type}_${period}`;
      const { data, error } = await supabase
        .from('leaderboard_cache')
        .select(`
          profile_id,
          rank,
          metric_value,
          profiles!inner (
            id,
            username,
            avatar_url,
            gifter_level
          )
        `)
        .eq('leaderboard_type', leaderboardKey)
        .order('rank', { ascending: true })
        .limit(100);

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        profile_id: item.profiles.id,
        username: item.profiles.username,
        avatar_url: item.profiles.avatar_url,
        rank: item.rank,
        metric_value: item.metric_value,
        gifter_level: item.profiles.gifter_level || 0,
      })).filter((entry: any) => Number(entry.metric_value ?? 0) > 0);

      setEntries(formatted);
    } catch (error) {
      console.error('[Leaderboard] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.leaderboardContainer}>
      <View style={styles.leaderboardTabs}>
        <TouchableOpacity
          style={[styles.leaderboardTab, type === 'top_streamers' && styles.leaderboardTabActive]}
          onPress={() => setType('top_streamers')}
        >
          <Text style={[styles.leaderboardTabText, type === 'top_streamers' && styles.leaderboardTabTextActive]}>
            Streamers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.leaderboardTab, type === 'top_gifters' && styles.leaderboardTabActive]}
          onPress={() => setType('top_gifters')}
        >
          <Text style={[styles.leaderboardTabText, type === 'top_gifters' && styles.leaderboardTabTextActive]}>
            Gifters
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.leaderboardPeriodTabs}>
        {(['daily', 'weekly', 'alltime'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.leaderboardPeriodTab, period === p && styles.leaderboardPeriodTabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.leaderboardPeriodTabText, period === p && styles.leaderboardPeriodTabTextActive]}>
              {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No leaderboard data yet</Text>
        </View>
      ) : (
        <ScrollView style={styles.leaderboardList}>
          {entries.map((entry) => (
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
                <Text style={styles.leaderboardUsername}>{entry.username}</Text>
                {entry.gifter_level > 0 && (
                  <Text style={styles.leaderboardBadge}>L{entry.gifter_level}</Text>
                )}
              </View>
              <Text style={styles.leaderboardValue}>
                {entry.metric_value.toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
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
    minHeight: 300,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 12,
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
  chatMessageText: {
    color: '#fff',
    flexWrap: 'wrap',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100,
  },
  chatSendButton: {
    padding: 8,
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
  leaderboardTabs: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 0,
  },
  leaderboardTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  leaderboardTabActive: {
    borderBottomColor: '#4a90d9',
  },
  leaderboardTabText: {
    color: '#888',
    fontWeight: '600',
  },
  leaderboardTabTextActive: {
    color: '#4a90d9',
  },
  leaderboardPeriodTabs: {
    flexDirection: 'row',
    padding: 12,
  },
  leaderboardPeriodTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  leaderboardPeriodTabActive: {
    backgroundColor: '#4a90d9',
  },
  leaderboardPeriodTabText: {
    color: '#888',
    fontSize: 12,
  },
  leaderboardPeriodTabTextActive: {
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardUsername: {
    color: '#fff',
    marginRight: 6,
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
