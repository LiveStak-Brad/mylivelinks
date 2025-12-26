import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PageShell, BottomNav } from '../components/ui';
import type { MainTabsParamList } from '../types/navigation';
import { useNoties } from '../hooks/useNoties';

type Props = BottomTabScreenProps<MainTabsParamList, 'Noties'>;

/**
 * NOTIES SCREEN - Mobile parity with web
 * 
 * Matches web app/noties/page.tsx layout:
 * - List of notifications with icons, message, and timestamp
 * - Unread indicator (dot)
 * - Type-specific icons (gift, follow, live, etc.)
 * - Empty state when no notifications
 * - Mark all as read button
 */
export function NotiesScreen({ navigation }: Props) {
  const { noties, isLoading, unreadCount, markAllAsRead, markAsRead } = useNoties();

  const handleMarkAllRead = () => {
    console.log('[Noties] Mark all as read');
    markAllAsRead();
  };

  return (
    <PageShell title="Notifications" contentStyle={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>
                Stay updated with your activity
              </Text>
            </View>
          </View>
          {noties.length > 0 && (
            <Pressable onPress={handleMarkAllRead}>
              <Text style={styles.markAllButton}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        {/* Notifications List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : noties.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyDescription}>
              When you get notifications, they'll appear here
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {noties.map((notie) => (
              <Pressable
                key={notie.id}
                style={({ pressed }) => [
                  styles.notieRow,
                  !notie.isRead && styles.notieRowUnread,
                  pressed && styles.notieRowPressed,
                ]}
                onPress={() => {
                  console.log('[Noties] Tapped:', notie.id);
                  if (!notie.isRead) {
                    markAsRead(notie.id);
                  }
                  // TODO: Navigate to action URL
                }}
              >
                {/* Icon */}
                <View style={styles.notieIcon}>
                  <Text style={styles.notieIconText}>
                    {getNotieIcon(notie.type)}
                  </Text>
                </View>

                {/* Content */}
                <View style={styles.notieContent}>
                  <Text style={styles.notieMessage}>
                    {notie.message}
                  </Text>
                  <Text style={styles.notieTime}>
                    {formatTime(notie.createdAt)}
                  </Text>
                </View>

                {/* Unread indicator */}
                {!notie.isRead && (
                  <View style={styles.unreadDot} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      <BottomNav navigation={navigation} currentRoute="Noties" />
    </PageShell>
  );
}

// Get icon for notification type (matches web)
function getNotieIcon(type: string): string {
  switch (type) {
    case 'gift':
      return '🎁';
    case 'follow':
      return '👤';
    case 'live':
      return '📹';
    case 'mention':
    case 'comment':
      return '💬';
    case 'level_up':
      return '⭐';
    case 'purchase':
      return '💰';
    case 'conversion':
      return '💎';
    case 'system':
    default:
      return '🔔';
  }
}

// Helper function to format time (matches web behavior)
function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return d.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bellIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9aa0a6',
  },
  markAllButton: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
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
  notieRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'transparent',
  },
  notieRowUnread: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  notieRowPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  notieIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notieIconText: {
    fontSize: 28,
  },
  notieContent: {
    flex: 1,
  },
  notieMessage: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 4,
  },
  notieTime: {
    fontSize: 13,
    color: '#9aa0a6',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginLeft: 12,
    marginTop: 6,
  },
});
