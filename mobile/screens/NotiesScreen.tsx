import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PageShell, PageHeader } from '../components/ui';
import type { MainTabsParamList } from '../types/navigation';
import { useNoties } from '../hooks/useNoties';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { getAvatarSource } from '../lib/defaultAvatar';
import { resolveNotieAction } from '../lib/noties/resolveNotieAction';

type Props = BottomTabScreenProps<MainTabsParamList, 'Noties'>;

/**
 * NOTIES SCREEN - Mobile parity with web
 * 
 * Structure:
 * - Global top bar (hamburger, logo, avatar)
 * - Page header: 🔔 Noties
 * - Mark all read button (in PageHeader action slot)
 * - List of notifications
 * 
 * NO duplicate headers, NO "Notifications" text
 */
export function NotiesScreen({ navigation }: Props) {
  const { noties, isLoading, unreadCount, markAllAsRead, markAsRead } = useNoties();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleMarkAllRead = () => {
    console.log('[Noties] Mark all as read');
    markAllAsRead();
  };

  const handleNavigateActionUrl = (actionUrl?: string) => {
    const url = typeof actionUrl === 'string' ? actionUrl.trim() : '';
    if (!url) return;

    const resolved = resolveNotieAction(url);
    const parent = navigation.getParent?.();

    if (resolved) {
      switch (resolved.route) {
        case 'profile': {
          const username = resolved.params.username;
          if (username) navigation.navigate('Profile', { username });
          return;
        }
        case 'wallet': {
          parent?.navigate?.('Wallet');
          return;
        }
        case 'my_analytics': {
          parent?.navigate?.('MyAnalytics');
          return;
        }
        case 'rooms':
        case 'liveTV':
        case 'live': {
          parent?.navigate?.('Rooms');
          return;
        }
        case 'messages': {
          parent?.navigate?.('MainTabs', { screen: 'Messages' });
          return;
        }
        case 'feed': {
          parent?.navigate?.('MainTabs', { screen: 'Feed' });
          return;
        }
        case 'noties': {
          parent?.navigate?.('MainTabs', { screen: 'Noties' });
          return;
        }
        case 'external': {
          const externalUrl = resolved.params.url;
          if (!externalUrl) return;
          try {
            void Linking.openURL(externalUrl);
          } catch {
            // ignore
          }
          return;
        }
        default:
          break;
      }
    }

    try {
      const absolute = url.startsWith('http') ? url : `https://www.mylivelinks.com${url}`;
      void Linking.openURL(absolute);
    } catch {
      // ignore
    }
  };

  return (
    <PageShell 
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={() => navigation.navigate('Home')}
      onNavigateToProfile={(username) => {
        navigation.navigate('Profile', { username });
      }}
      onNavigateToRooms={() => navigation.getParent?.()?.navigate?.('Rooms')}
    >
      {/* Page Header: Bell icon + Noties with Mark all read button */}
      <PageHeader
        icon="bell"
        iconColor="#f59e0b"
        title="Noties"
        action={
          noties.length > 0 ? (
            <Pressable onPress={handleMarkAllRead}>
              <Text style={styles.markAllButton}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      <View style={styles.content}>
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
                  handleNavigateActionUrl(notie.actionUrl);
                }}
              >
                <View style={styles.avatarWrap}>
                  <Image
                    source={getAvatarSource(notie.avatarUrl)}
                    style={styles.avatarImage}
                  />
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarBadgeText}>
                      {getNotieIcon(notie.type)}
                    </Text>
                  </View>
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
    markAllButton: {
      fontSize: 14,
      color: theme.colors.accent,
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
    notieRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginHorizontal: 12,
      marginVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.menuShadow,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    notieRowUnread: {
      backgroundColor: theme.colors.highlight,
    },
    notieRowPressed: {
      backgroundColor: theme.colors.cardAlt,
    },
    avatarWrap: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      position: 'relative',
    },
    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarFallbackText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    avatarBadge: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarBadgeText: {
      fontSize: 12,
    },
    notieContent: {
      flex: 1,
    },
    notieMessage: {
      fontSize: 15,
      color: theme.colors.textPrimary,
      lineHeight: 20,
      marginBottom: 4,
    },
    notieTime: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.accent,
      marginLeft: 12,
      marginTop: 6,
    },
  });
}
