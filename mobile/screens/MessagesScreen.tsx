import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PageShell, BottomNav } from '../components/ui';
import type { MainTabsParamList } from '../types/navigation';
import { useMessages } from '../hooks/useMessages';

type Props = BottomTabScreenProps<MainTabsParamList, 'Messages'>;

/**
 * MESSAGES SCREEN - Mobile parity with web
 * 
 * Matches web app/messages/page.tsx layout:
 * - List of conversations with avatars, names, preview text, timestamps
 * - Unread indicators (badges)
 * - Empty state when no messages
 * - Search functionality
 * - Tap to open conversation thread
 */
export function MessagesScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, isLoading, totalUnreadCount } = useMessages();

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

  return (
    <PageShell title="Messages" contentStyle={styles.container}>
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
            <ActivityIndicator size="large" color="#8B5CF6" />
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
                  // TODO: Navigate to conversation thread
                  console.log('[Messages] Open conversation:', conv.id);
                }}
              >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {conv.recipientUsername?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
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
      <BottomNav navigation={navigation} currentRoute="Messages" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
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
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#9aa0a6',
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom nav
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  conversationRowPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
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
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 13,
    color: '#9aa0a6',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#9aa0a6',
  },
  conversationPreviewUnread: {
    fontWeight: '600',
    color: '#fff',
  },
});
