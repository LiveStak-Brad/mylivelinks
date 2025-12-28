import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PageShell, PageHeader } from '../components/ui';
import type { MainTabsParamList } from '../types/navigation';
import { useMessages } from '../hooks/useMessages';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { getAvatarSource } from '../lib/defaultAvatar';

type Props = BottomTabScreenProps<MainTabsParamList, 'Messages'>;

/**
 * MESSAGES SCREEN - Mobile parity with web
 * 
 * Structure:
 * - Global top bar (hamburger, logo, avatar)
 * - Page header: 💬 Messages
 * - Search bar
 * - Conversations list OR thread view
 */
export function MessagesScreen({ navigation: _navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const lastAutoOpenedRef = useRef<string>('');
  const {
    conversations,
    isLoading,
    activeConversationId,
    setActiveConversationId,
    messages,
    sendMessage,
    currentUserId,
    resolveProfileIdByUsername,
  } = useMessages();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // If we were deep-linked here from a profile "Message" button, auto-open that conversation.
  useEffect(() => {
    const openUserId = route.params?.openUserId;
    if (!openUserId) return;
    if (lastAutoOpenedRef.current === openUserId) return;
    lastAutoOpenedRef.current = openUserId;
    setActiveConversationId(openUserId);
    try {
      _navigation.setParams({ openUserId: undefined });
    } catch {
      // ignore
    }
  }, [_navigation, route.params?.openUserId, setActiveConversationId]);

  useEffect(() => {
    const openUsername = route.params?.openUsername;
    if (!openUsername) return;

    const normalized = String(openUsername).trim().replace(/^@/, '');
    if (!normalized) return;
    if (lastAutoOpenedRef.current === `u:${normalized.toLowerCase()}`) return;

    void (async () => {
      const resolved = await resolveProfileIdByUsername(normalized);
      if (!resolved?.profileId) return;

      lastAutoOpenedRef.current = `u:${normalized.toLowerCase()}`;
      setActiveConversationId(resolved.profileId);

      try {
        _navigation.setParams({ openUsername: undefined });
      } catch {
        // ignore
      }
    })();
  }, [_navigation, resolveProfileIdByUsername, route.params?.openUsername, setActiveConversationId]);

  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)
    : undefined;

  // Filter conversations by search query (matches web logic)
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.recipientDisplayName?.toLowerCase().includes(query) ||
      conv.recipientUsername?.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  });

  if (activeConversationId) {
    return (
      <PageShell
        contentStyle={styles.container}
        useNewHeader
        onNavigateHome={() => _navigation.navigate('Home')}
        onNavigateToProfile={(username) => {
          _navigation.navigate('Profile', { username });
        }}
        onNavigateToRooms={() => _navigation.getParent?.()?.navigate?.('Rooms')}
      >
        <PageHeader
          icon="message-circle"
          iconColor="#00a8ff"
          title={activeConversation?.recipientDisplayName || activeConversation?.recipientUsername || 'Messages'}
          action={
            <Pressable
              onPress={() => {
                setDraftMessage('');
                setActiveConversationId(null);
              }}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          }
        />

        <View style={styles.threadContainer}>
          <ScrollView
            style={styles.threadScroll}
            contentContainerStyle={styles.threadScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => {
              const isMe = currentUserId ? m.senderId === currentUserId : false;
              const senderLabel =
                isMe
                  ? 'You'
                  : activeConversation?.recipientDisplayName || activeConversation?.recipientUsername || 'Them';

              if (m.type === 'gift') {
                const giftName = m.giftName || 'Gift';
                const giftCoins = m.giftCoins ?? 0;
                const giftIcon = typeof m.giftIcon === 'string' ? m.giftIcon : '';
                const isIconUrl =
                  giftIcon.startsWith('http://') ||
                  giftIcon.startsWith('https://') ||
                  giftIcon.startsWith('/');

                return (
                  <View
                    key={m.id}
                    style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
                  >
                    <View style={styles.giftBubble}>
                      <View style={styles.giftRow}>
                        <View style={styles.giftIconWrap}>
                          {giftIcon && isIconUrl ? (
                            <Image
                              source={{ uri: giftIcon }}
                              style={styles.giftIconImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <Text style={styles.giftIconText}>{giftIcon || getGiftEmoji(giftName)}</Text>
                          )}
                        </View>
                        <View style={styles.giftTextWrap}>
                          <Text style={styles.giftTitle}>{senderLabel} sent a gift!</Text>
                          <Text style={styles.giftSubtitle}>
                            {giftName} • {giftCoins} 💰 (+{giftCoins} 💎)
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }

              if (m.type === 'image') {
                const imageUri = resolveMediaUrl(m.imageUrl ?? null);
                return (
                  <View
                    key={m.id}
                    style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.imageBubble} resizeMode="cover" />
                    ) : (
                      <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                        <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                          📷 Photo
                        </Text>
                      </View>
                    )}
                  </View>
                );
              }

              return (
                <View
                  key={m.id}
                  style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
                >
                  <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                    <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                      {m.content}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.composerContainer}>
            <TextInput
              placeholder="Message..."
              placeholderTextColor="#9aa0a6"
              value={draftMessage}
              onChangeText={setDraftMessage}
              style={styles.composerInput}
              multiline
            />
            <Pressable
              disabled={!draftMessage.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                !draftMessage.trim() && styles.sendButtonDisabled,
                pressed && !!draftMessage.trim() && styles.sendButtonPressed,
              ]}
              onPress={async () => {
                const content = draftMessage.trim();
                if (!content) return;
                setDraftMessage('');
                const ok = await sendMessage(activeConversationId, content);
                if (!ok) setDraftMessage(content);
              }}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell 
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={() => _navigation.navigate('Home')}
      onNavigateToProfile={(username) => {
        _navigation.navigate('Profile', { username });
      }}
      onNavigateToRooms={() => _navigation.getParent?.()?.navigate?.('Rooms')}
    >
      {/* Page Header: MessageCircle icon + Messys */}
      <PageHeader icon="message-circle" iconColor="#00a8ff" title="Messages" />

      <View style={styles.content}>
        {/* Search Bar - matches web */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor="#9aa0a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Conversations List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.mode === 'light' ? '#EC4899' : '#F472B6'} />
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Try a different search term'
                : 'Start a conversation with someone'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredConversations.map((conv) => (
              <Pressable
                key={conv.id}
                style={({ pressed }) => [
                  styles.conversationRow,
                  pressed && styles.conversationRowPressed,
                ]}
                onPress={() => {
                  setActiveConversationId(conv.id);
                }}
              >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <Image
                    source={getAvatarSource(resolveMediaUrl(conv.recipientAvatar ?? null))}
                    style={styles.avatarImage}
                  />
                  {/* Unread badge */}
                  {conv.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {conv.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text
                      style={styles.conversationName}
                      numberOfLines={1}
                    >
                      {conv.recipientDisplayName || conv.recipientUsername}
                    </Text>
                    <Text style={styles.conversationTime}>
                      {formatTime(conv.lastMessageAt)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.conversationPreview,
                      conv.unreadCount > 0 && styles.conversationPreviewUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {conv.lastMessage || 'No messages'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </PageShell>
  );
}

// Helper function to format time (matches web behavior)
function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return d.toLocaleDateString();
}

function getGiftEmoji(name: string) {
  const emojiMap: { [key: string]: string } = {
    Poo: '💩',
    Rose: '🌹',
    Heart: '❤️',
    Star: '⭐',
    Diamond: '💎',
    'Super Star': '🌟',
    Crown: '👑',
    Platinum: '💠',
    Legendary: '🏆',
    Fire: '🔥',
    Rocket: '🚀',
    Rainbow: '🌈',
    Unicorn: '🦄',
    Party: '🎉',
    Confetti: '🎊',
    Champagne: '🍾',
    Money: '💰',
    Cash: '💵',
    Gold: '🥇',
    Silver: '🥈',
    Bronze: '🥉',
    Kiss: '💋',
    Hug: '🤗',
    Love: '💕',
    Sparkle: '✨',
    Gem: '💎',
    Crystal: '🔮',
    Music: '🎵',
    Microphone: '🎤',
    Camera: '📸',
    Clap: '👏',
    'Thumbs Up': '👍',
    Wave: '👋',
    Flex: '💪',
    Cool: '😎',
    Hot: '🥵',
    VIP: '🎯',
    King: '🤴',
    Queen: '👸',
    Angel: '😇',
    Devil: '😈',
  };
  return emojiMap[name] || '🎁';
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    threadContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    backButtonPressed: {
      opacity: 0.8,
    },
    backButtonText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    threadScroll: {
      flex: 1,
    },
    threadScrollContent: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    messageRow: {
      marginVertical: 4,
      flexDirection: 'row',
    },
    messageRowMe: {
      justifyContent: 'flex-end',
    },
    messageRowOther: {
      justifyContent: 'flex-start',
    },
    messageBubble: {
      maxWidth: '80%',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
    },
    messageBubbleMe: {
      backgroundColor: theme.mode === 'light' ? '#EC4899' : '#F472B6', // Pink message bubbles
    },
    messageBubbleOther: {
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    imageBubble: {
      width: 220,
      height: 220,
      borderRadius: 14,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    messageTextMe: {
      color: '#fff',
      fontWeight: '600',
    },
    messageTextOther: {
      color: theme.colors.text,
      fontWeight: '500',
    },
    giftBubble: {
      maxWidth: '80%',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    giftRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    giftIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      overflow: 'hidden',
    },
    giftIconText: {
      fontSize: 26,
    },
    giftIconImage: {
      width: 34,
      height: 34,
    },
    giftTextWrap: {
      flex: 1,
    },
    giftTitle: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 2,
    },
    giftSubtitle: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '600',
    },
    composerContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      gap: 10,
    },
    composerInput: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
      color: theme.colors.text,
      fontSize: 15,
    },
    sendButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.mode === 'light' ? '#EC4899' : '#F472B6', // Pink send button
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonPressed: {
      opacity: 0.85,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mode === 'light' 
        ? 'rgba(236, 72, 153, 0.05)' // Pink tint background
        : 'rgba(244, 114, 182, 0.08)',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: theme.mode === 'light' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(244, 114, 182, 0.25)', // Pink border
      shadowColor: theme.mode === 'light' ? '#EC4899' : '#F472B6',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    searchIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      padding: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 15,
      color: theme.colors.mutedText,
      textAlign: 'center',
      lineHeight: 22,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 16, // Space for tab bar (React Navigation handles the rest)
      backgroundColor: theme.colors.background,
    },
    conversationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 12,
      marginVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.mode === 'light' 
        ? 'rgba(236, 72, 153, 0.05)' // Light pink tint background
        : 'rgba(244, 114, 182, 0.08)', // Darker pink tint for dark mode
      borderWidth: 1,
      borderColor: theme.mode === 'light' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(244, 114, 182, 0.25)', // Pink border
      shadowColor: theme.mode === 'light' ? '#EC4899' : '#F472B6',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    conversationRowPressed: {
      backgroundColor: theme.mode === 'light' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(244, 114, 182, 0.15)', // Deeper pink on press
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.mode === 'light' ? '#EC4899' : '#F472B6', // Pink accent
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.mode === 'light' ? '#EC4899' : '#F472B6',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    avatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.cardAlt,
    },
    avatarText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },
    unreadBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: theme.mode === 'light' ? '#EC4899' : '#F472B6', // Pink badge
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      shadowColor: theme.mode === 'light' ? '#EC4899' : '#000',
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    unreadBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    conversationContent: {
      flex: 1,
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 4,
    },
    conversationName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginRight: 8,
    },
    conversationTime: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    conversationPreview: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    conversationPreviewUnread: {
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
  });
}
