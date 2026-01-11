import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const TAB_BAR_SAFE_PADDING = 96;

type MockFriend = {
  id: string;
  displayName: string;
  isOnline?: boolean;
  isLive?: boolean;
};

type MockConversation = {
  id: string;
  displayName: string;
  username: string;
  lastMessage: string;
  timeLabel: string;
  unreadCount?: number;
  isOnline?: boolean;
  isLive?: boolean;
  lastMessageSentByMe?: boolean;
  lastMessageRead?: boolean;
};

function AvatarPlaceholder({
  label,
  size,
  isLive,
  isOnline,
}: {
  label: string;
  size: number;
  isLive?: boolean;
  isOnline?: boolean;
}) {
  const initial = label.trim().slice(0, 1).toUpperCase() || '•';

  return (
    <View style={styles.avatarOuter}>
      <View style={[styles.avatarRing, isLive ? styles.avatarRingLive : undefined]}>
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </View>

      {!isLive && isOnline ? <View style={styles.onlineDot} /> : null}
    </View>
  );
}

function FriendsStrip({ friends }: { friends: MockFriend[] }) {
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
            <Pressable accessibilityRole="button" onPress={() => {}} style={({ pressed }) => [styles.friendItem, pressed && styles.pressed]}>
              <View>
                <AvatarPlaceholder label={item.displayName} size={56} isLive={item.isLive} isOnline={item.isOnline} />
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

function ConversationRow({ conversation }: { conversation: MockConversation }) {
  const unreadCount = conversation.unreadCount ?? 0;
  const showUnread = unreadCount > 0;

  const checkText =
    conversation.lastMessageSentByMe && conversation.lastMessageRead ? '✓✓' : conversation.lastMessageSentByMe ? '✓' : '';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {}}
      style={({ pressed }) => [
        styles.conversationRow,
        pressed && styles.conversationRowPressed,
        showUnread && styles.conversationRowUnread,
      ]}
    >
      <AvatarPlaceholder
        label={conversation.displayName || conversation.username}
        size={48}
        isLive={conversation.isLive}
        isOnline={conversation.isOnline}
      />

      <View style={styles.conversationBody}>
        <View style={styles.conversationTopRow}>
          <Text numberOfLines={1} style={[styles.conversationName, showUnread && styles.conversationNameUnread]}>
            {conversation.displayName || conversation.username}
          </Text>
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
  const [searchQuery, setSearchQuery] = useState('');

  const friends = useMemo<MockFriend[]>(
    () => [
      { id: 'f1', displayName: 'Mia', isLive: true },
      { id: 'f2', displayName: 'Jay', isOnline: true },
      { id: 'f3', displayName: 'Sofia', isOnline: true },
      { id: 'f4', displayName: 'Noah' },
      { id: 'f5', displayName: 'Ava', isOnline: true },
      { id: 'f6', displayName: 'Liam' },
      { id: 'f7', displayName: 'Zoe', isLive: true },
    ],
    []
  );

  const conversations = useMemo<MockConversation[]>(
    () => [
      {
        id: 'c1',
        displayName: 'Mia Rodriguez',
        username: 'miarod',
        lastMessage: 'You going live tonight?',
        timeLabel: '2m',
        unreadCount: 2,
        isLive: true,
        isOnline: true,
      },
      {
        id: 'c2',
        displayName: 'Jay Carter',
        username: 'jaycarter',
        lastMessage: 'Sent you the clip — it’s insane 🔥',
        timeLabel: '14m',
        unreadCount: 0,
        isOnline: true,
        lastMessageSentByMe: true,
        lastMessageRead: true,
      },
      {
        id: 'c3',
        displayName: 'Sofia',
        username: 'sofia',
        lastMessage: 'Let’s run a battle in an hour.',
        timeLabel: '1h',
        unreadCount: 1,
        isOnline: true,
      },
      {
        id: 'c4',
        displayName: 'Noah',
        username: 'noah',
        lastMessage: 'Ok cool — see you then.',
        timeLabel: '3h',
        unreadCount: 0,
        lastMessageSentByMe: true,
        lastMessageRead: false,
      },
      {
        id: 'c5',
        displayName: 'Ava Kim',
        username: 'avak',
        lastMessage: '😂😂',
        timeLabel: '6h',
        unreadCount: 0,
      },
      {
        id: 'c6',
        displayName: 'Liam',
        username: 'liam',
        lastMessage: 'Can you pin the schedule?',
        timeLabel: '1d',
        unreadCount: 5,
      },
      {
        id: 'c7',
        displayName: 'Zoe',
        username: 'zoe',
        lastMessage: 'Gift battle rematch? 🎁',
        timeLabel: '2d',
        unreadCount: 0,
        isLive: true,
      },
      {
        id: 'c8',
        displayName: 'Chris',
        username: 'chris',
        lastMessage: 'Thanks again 🙏',
        timeLabel: 'Jan 2',
        unreadCount: 0,
      },
      {
        id: 'c9',
        displayName: 'Nina',
        username: 'nina',
        lastMessage: 'I’m outside.',
        timeLabel: 'Dec 28',
        unreadCount: 3,
        isOnline: true,
      },
      {
        id: 'c10',
        displayName: 'Drew',
        username: 'drew',
        lastMessage: 'lol',
        timeLabel: 'Dec 20',
        unreadCount: 0,
      },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
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
            </View>

            {/* Friends strip */}
            <FriendsStrip friends={friends} />

            <View style={styles.sectionDivider} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0F172A',
  mutedText: '#64748B',
  mutedBg: '#F1F5F9',
  primary: '#4F46E5',
  liveRed: '#EF4444',
  pink: '#EC4899',
  purple: '#A855F7',
  unreadBg: '#4F46E5',
};

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.96)',
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
    backgroundColor: 'rgba(241,245,249,0.35)',
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
    color: 'rgba(100,116,139,0.8)',
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
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(79,70,229,0.06)',
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
  conversationName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    color: stylesVars.text,
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
    color: 'rgba(100,116,139,0.6)',
    fontWeight: '800',
  },
  snippetCheckRead: {
    color: '#60A5FA',
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
    color: '#FFFFFF',
    fontWeight: '900',
  },

  pressed: {
    opacity: 0.9,
  },
});

