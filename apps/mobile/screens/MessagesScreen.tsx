import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import { brand, darkPalette, lightPalette } from '../theme/colors';
import MllProBadge from '../components/shared/MllProBadge';

const TAB_BAR_SAFE_PADDING = 96;
const NO_PROFILE_PIC = require('../assets/no-profile-pic.png');

type MockFriend = {
  id: string;
  displayName: string;
  isOnline?: boolean;
  isLive?: boolean;
  avatarUrl?: string | null;
};

type ImConversationRow = {
  other_user_id: string;
  other_username: string | null;
  other_avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | string | null;
  is_sender: boolean | null;
};

type ProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_live: boolean | null;
  is_mll_pro: boolean | null;
};

type FriendsListRpc = {
  friends: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_live: boolean | null;
  }>;
  total: number;
};

function AvatarPlaceholder({
  label,
  size,
  isLive,
  isOnline,
  avatarUrl,
  styles,
}: {
  label: string;
  size: number;
  isLive?: boolean;
  isOnline?: boolean;
  avatarUrl?: string | null;
  styles: any;
}) {
  const initial = label.trim().slice(0, 1).toUpperCase() || '•';

  return (
    <View style={styles.avatarOuter}>
      <View style={[styles.avatarRing, isLive ? styles.avatarRingLive : undefined]}>
        <Image
          source={avatarUrl && avatarUrl.trim() ? { uri: avatarUrl } : NO_PROFILE_PIC}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      </View>

      {!isLive && isOnline ? <View style={styles.onlineDot} /> : null}
    </View>
  );
}

function FriendsStrip({ friends, styles, stylesVars, navigation }: { friends: MockFriend[]; styles: any; stylesVars: any; navigation: any }) {
  return (
    <View style={styles.friendsSection}>
      <View style={styles.friendsHeaderRow}>
        <Feather name="users" size={14} color={stylesVars.mutedText} />
        <Text style={styles.friendsHeaderLabel}>Friends</Text>
        <Text style={styles.friendsHeaderCount}>({friends.length})</Text>
      </View>

      <FlatList
        horizontal
        data={friends}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.friendsListContent}
        renderItem={({ item }) => {
          return (
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('IMThreadScreen', { otherProfileId: item.id, otherDisplayName: item.displayName, otherAvatarUrl: item.avatarUrl })} style={({ pressed }) => [styles.friendItem, pressed && styles.pressed]}>
              <View>
                <AvatarPlaceholder
                  label={item.displayName}
                  size={56}
                  isLive={item.isLive}
                  isOnline={item.isOnline}
                  avatarUrl={item.avatarUrl}
                  styles={styles}
                />
                {item.isLive ? (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.friendName}>
                {item.displayName}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function formatRelativeTimeLabel(iso: string | null | undefined) {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - ms) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const d = new Date(ms);
  const month = d.toLocaleString(undefined, { month: 'short' });
  const day = d.getDate();
  return `${month} ${day}`;
}

function formatImPreview(content: string | null | undefined) {
  const text = String(content ?? '').trim();
  if (!text) return '';
  if (text.startsWith('__gift__:')) {
    try {
      const parsed = JSON.parse(text.slice('__gift__:'.length));
      const giftName = typeof parsed?.giftName === 'string' ? parsed.giftName : null;
      return giftName ? `🎁 ${giftName}` : '🎁 Gift';
    } catch {
      return '🎁 Gift';
    }
  }
  if (text.startsWith('__img__:')) return '📷 Photo';
  // Check for share message (JSON with type: 'share')
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed?.type === 'share') {
        const contentType = parsed?.contentType || 'video';
        if (contentType === 'live') return '🔴 Shared a live stream';
        if (contentType === 'profile') return '👤 Shared a profile';
        if (contentType === 'photo') return '📷 Shared a photo';
        return '🎬 Shared a video';
      }
    } catch {
      // Not valid JSON, fall through
    }
  }
  return text;
}

function ConversationRow({
  conversation,
  onPress,
  styles,
}: {
  conversation: {
    otherProfileId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    lastMessage: string;
    timeLabel: string;
    unreadCount: number;
    isLive?: boolean;
    isOnline?: boolean;
    isMllPro?: boolean;
    lastMessageSentByMe?: boolean;
    lastMessageRead?: boolean;
  };
  onPress: () => void;
  styles: any;
}) {
  const unreadCount = conversation.unreadCount ?? 0;
  const showUnread = unreadCount > 0;

  const checkText =
    conversation.lastMessageSentByMe && conversation.lastMessageRead ? '✓✓' : conversation.lastMessageSentByMe ? '✓' : '';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.conversationRow,
        pressed && styles.conversationRowPressed,
        showUnread && styles.conversationRowUnread,
      ]}
    >
      <AvatarPlaceholder
        label={conversation.displayName || conversation.username || 'Unknown'}
        size={48}
        isLive={conversation.isLive}
        isOnline={conversation.isOnline}
        avatarUrl={conversation.avatarUrl}
        styles={styles}
      />

      <View style={styles.conversationBody}>
        <View style={styles.conversationTopRow}>
          <View style={styles.conversationNameRow}>
            <Text numberOfLines={1} style={[styles.conversationName, showUnread && styles.conversationNameUnread]}>
              {conversation.displayName || conversation.username}
            </Text>
            {conversation.isMllPro && <MllProBadge size="sm" />}
          </View>
          <Text style={[styles.conversationTime, showUnread && styles.conversationTimeUnread]}>{conversation.timeLabel}</Text>
        </View>

        <View style={styles.conversationBottomRow}>
          <View style={styles.snippetWrap}>
            {checkText ? <Text style={[styles.snippetCheck, conversation.lastMessageRead ? styles.snippetCheckRead : undefined]}>{checkText}</Text> : null}
            <Text numberOfLines={1} style={[styles.conversationSnippet, showUnread && styles.conversationSnippetUnread]}>
              {conversation.lastMessage}
            </Text>
          </View>

          {showUnread ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { mode, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const stylesVars = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      mutedText: colors.mutedText,
      mutedBg: mode === 'dark' ? darkPalette.slate800 : lightPalette.slate100,
      primary: brand.purple,
      liveRed: brand.red,
      pink: brand.pink,
      purple: brand.purple,
      unreadBg: brand.purple,
      pillText: mode === 'dark' ? darkPalette.slate100 : lightPalette.white,
      readBlue: mode === 'dark' ? darkPalette.blue400 : lightPalette.blue600,
      subtleRow: mode === 'dark' ? 'rgba(96,165,250,0.08)' : 'rgba(79,70,229,0.06)',
    }),
    [colors, mode]
  );

  const styles = useMemo(() => createStyles(stylesVars), [stylesVars]);

  const [friends, setFriends] = useState<MockFriend[]>([]);
  const [conversations, setConversations] = useState<
    Array<{
      otherProfileId: string;
      displayName: string;
      username: string | null;
      avatarUrl: string | null;
      lastMessage: string;
      timeLabel: string;
      unreadCount: number;
      isLive?: boolean;
      isMllPro?: boolean;
      lastMessageSentByMe?: boolean;
      lastMessageRead?: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user?.id) return;

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_friends_list', {
      p_profile_id: user.id,
      p_limit: 200,
      p_offset: 0,
    });

    if (rpcError) {
      console.warn('[messages] get_friends_list error:', rpcError.message);
      setFriends([]);
      return;
    }

    const parsed = (rpcData as any) as FriendsListRpc;
    const rawFriends = Array.isArray(parsed?.friends) ? parsed.friends : [];
    const ids = rawFriends.map((f) => String(f.id)).filter(Boolean);

    const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: onlineData, error: onlineError } = ids.length
      ? await supabase.from('room_presence').select('profile_id').in('profile_id', ids).gt('last_seen_at', cutoff)
      : { data: [], error: null };

    if (onlineError) {
      console.warn('[messages] room_presence error:', onlineError.message);
    }

    const onlineSet = new Set((onlineData ?? []).map((o: any) => String(o.profile_id)));

    const list: MockFriend[] = rawFriends.map((f) => ({
      id: String(f.id),
      displayName: String(f.display_name || f.username || 'User'),
      isLive: Boolean(f.is_live),
      isOnline: onlineSet.has(String(f.id)),
      avatarUrl: f.avatar_url ?? null,
    }));

    // Deduplicate by ID to prevent duplicate key warnings
    const uniqueList = list.filter((friend, index, self) => 
      index === self.findIndex(f => f.id === friend.id)
    );

    // Keep the existing feel: live first, then online, then alphabetical.
    uniqueList.sort((a, b) => {
      if (Boolean(a.isLive) && !Boolean(b.isLive)) return -1;
      if (!Boolean(a.isLive) && Boolean(b.isLive)) return 1;
      if (Boolean(a.isOnline) && !Boolean(b.isOnline)) return -1;
      if (!Boolean(a.isOnline) && Boolean(b.isOnline)) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    setFriends(uniqueList);
  }, [user?.id]);

  const loadInbox = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    const { data: rows, error: rpcError } = await supabase.rpc('get_im_conversations', { p_user_id: user.id });
    if (rpcError) {
      console.error('[messages] get_im_conversations error:', rpcError.message);
      setConversations([]);
      setFriends([]);
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const raw = ((rows as any) ?? []) as ImConversationRow[];
    const otherIds = raw.map((r) => String(r.other_user_id)).filter(Boolean);

    const profileById = new Map<string, ProfileLite>();
    if (otherIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_live, is_mll_pro')
        .in('id', otherIds);

      if (profileError) {
        console.warn('[messages] profiles lookup error:', profileError.message);
      } else {
        (((profiles as any) ?? []) as ProfileLite[]).forEach((p) => profileById.set(String(p.id), p));
      }
    }

    const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: onlineData, error: onlineError } = otherIds.length
      ? await supabase.from('room_presence').select('profile_id').in('profile_id', otherIds).gt('last_seen_at', cutoff)
      : { data: [], error: null };
    if (onlineError) console.warn('[messages] room_presence error:', onlineError.message);
    const onlineSet = new Set((onlineData ?? []).map((o: any) => String(o.profile_id)));

    const mapped = raw.map((r) => {
      const otherId = String(r.other_user_id);
      const p = profileById.get(otherId);
      const username = p?.username ?? r.other_username ?? null;
      const displayName = p?.display_name ?? username ?? 'User';
      const avatarUrl = p?.avatar_url ?? r.other_avatar_url ?? null;
      const isLive = Boolean(p?.is_live);
      const isOnline = onlineSet.has(otherId);
      const unreadCount = Number(r.unread_count ?? 0) || 0;
      const timeLabel = formatRelativeTimeLabel(r.last_message_at);
      const lastMessage = formatImPreview(r.last_message);
      const lastMessageSentByMe = Boolean(r.is_sender);

      return {
        otherProfileId: otherId,
        displayName,
        username,
        avatarUrl,
        lastMessage,
        timeLabel,
        unreadCount,
        isLive,
        isOnline,
        isMllPro: Boolean(p?.is_mll_pro),
        lastMessageSentByMe,
        // IM table doesn't track per-message read for sender in a way we can reliably show here; keep UI consistent.
        lastMessageRead: false,
      };
    });

    setConversations(mapped);
    setLoading(false);
  }, [user?.id]);

  // Refresh inbox and friends when screen gains focus (e.g., returning from IMThreadScreen)
  useFocusEffect(
    useCallback(() => {
      void loadInbox();
      void loadFriends();
    }, [loadInbox, loadFriends])
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const hay = `${c.displayName ?? ''} ${c.username ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.otherProfileId}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() =>
              navigation.navigate('IMThreadScreen', {
                otherProfileId: item.otherProfileId,
                otherDisplayName: item.displayName,
                otherAvatarUrl: item.avatarUrl,
              })
            }
            styles={styles}
          />
        )}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_SAFE_PADDING + insets.bottom }]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Feather name="message-circle" size={20} color={stylesVars.primary} />
                <Text style={styles.headerTitle}>Messages</Text>
              </View>

              {/* Search */}
              <View style={styles.searchWrap}>
                <Feather name="search" size={16} color={stylesVars.mutedText} />
                <TextInput
                  placeholder="Search conversations..."
                  placeholderTextColor={stylesVars.mutedText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
              </View>
              {error ? (
                <Text style={{ marginTop: 8, color: colors.danger, fontSize: 12, fontWeight: '700' }} numberOfLines={2}>
                  {error}
                </Text>
              ) : null}
            </View>

            {/* Friends strip */}
            <FriendsStrip friends={friends} styles={styles} stylesVars={stylesVars} navigation={navigation} />

            <View style={styles.sectionDivider} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

type StylesVars = {
  bg: string;
  card: string;
  border: string;
  text: string;
  mutedText: string;
  mutedBg: string;
  primary: string;
  liveRed: string;
  pink: string;
  purple: string;
  unreadBg: string;
  pillText: string;
  readBlue: string;
  subtleRow: string;
};

function createStyles(stylesVars: StylesVars) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  listContent: {
    paddingTop: 8,
  },
  listHeader: {
    paddingBottom: 8,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: stylesVars.border,
    backgroundColor: stylesVars.card,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: stylesVars.text,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: stylesVars.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  friendsSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: stylesVars.border,
    backgroundColor: stylesVars.mutedBg,
  },
  friendsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  friendsHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },
  friendsHeaderCount: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  friendsListContent: {
    gap: 12,
    paddingRight: 8,
  },
  friendItem: {
    width: 72,
    alignItems: 'center',
  },
  friendName: {
    marginTop: 6,
    fontSize: 10,
    color: stylesVars.mutedText,
    fontWeight: '700',
    maxWidth: 72,
  },
  liveBadge: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    transform: [{ translateX: -18 }],
    width: 36,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stylesVars.liveRed,
    borderWidth: 2,
    borderColor: stylesVars.card,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: stylesVars.pillText,
    letterSpacing: 0.6,
  },

  sectionDivider: {
    height: 8,
    backgroundColor: stylesVars.bg,
  },

  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: stylesVars.bg,
  },
  conversationRowUnread: {
    backgroundColor: stylesVars.subtleRow,
  },
  conversationRowPressed: {
    opacity: 0.92,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: stylesVars.border,
    marginLeft: 16,
  },

  avatarOuter: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    borderRadius: 999,
    padding: 2,
    backgroundColor: 'transparent',
  },
  avatarRingLive: {
    backgroundColor: stylesVars.liveRed,
  },
  avatar: {
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: stylesVars.mutedText,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: stylesVars.purple,
    borderWidth: 2,
    borderColor: stylesVars.card,
  },

  conversationBody: {
    flex: 1,
    minWidth: 0,
  },
  conversationTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  conversationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  conversationName: {
    fontSize: 14,
    fontWeight: '700',
    color: stylesVars.text,
    flexShrink: 1,
  },
  conversationNameUnread: {
    fontWeight: '900',
  },
  conversationTime: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  conversationTimeUnread: {
    color: stylesVars.primary,
    fontWeight: '800',
  },

  conversationBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  snippetWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  snippetCheck: {
    fontSize: 10,
    color: stylesVars.mutedText,
    fontWeight: '800',
  },
  snippetCheckRead: {
    color: stylesVars.readBlue,
  },
  conversationSnippet: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  conversationSnippetUnread: {
    color: stylesVars.text,
    fontWeight: '700',
  },

  unreadPill: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: stylesVars.unreadBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPillText: {
    fontSize: 10,
    color: stylesVars.pillText,
    fontWeight: '900',
  },

  pressed: {
    opacity: 0.9,
  },
  });
}

