import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type MockNotie = {
  id: string;
  isRead: boolean;
  message: string;
  timestamp: string;
  avatarFallback: string;
  typeEmoji: string;
};

function NotieRow({ item }: { item: MockNotie }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.notieCard, pressed && styles.notieCardPressed]}
      onPress={() => {}}
    >
      <View style={[styles.notieRow, item.isRead ? styles.notieRowRead : styles.notieRowUnread]}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{item.avatarFallback || '?'}</Text>
          </View>

          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>{item.typeEmoji}</Text>
          </View>
        </View>

        <View style={styles.notieContent}>
          <Text style={styles.notieMessage}>{item.message}</Text>
          <Text style={styles.notieTimestamp}>{item.timestamp}</Text>
        </View>

        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle} accessibilityLabel="Notifications">
        <Feather name="bell" size={28} color={stylesVars.mutedText} />
      </View>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyBody}>When you get notifications, they'll appear here</Text>
    </View>
  );
}

export default function NotiesScreen() {
  const insets = useSafeAreaInsets();

  // Static UI-only mock items (10–15)
  const noties = useMemo<MockNotie[]>(
    () => [
      {
        id: 'n1',
        isRead: false,
        avatarFallback: 'S',
        typeEmoji: '🎁',
        message: 'StreamQueen sent you a gift.',
        timestamp: '1/11/2026, 3:14 PM',
      },
      {
        id: 'n2',
        isRead: false,
        avatarFallback: 'B',
        typeEmoji: '👤',
        message: 'Brad started following you.',
        timestamp: '1/11/2026, 2:55 PM',
      },
      {
        id: 'n3',
        isRead: true,
        avatarFallback: 'A',
        typeEmoji: '💬',
        message: 'Ava mentioned you in a comment.',
        timestamp: '1/10/2026, 9:41 PM',
      },
      {
        id: 'n4',
        isRead: true,
        avatarFallback: 'L',
        typeEmoji: '📹',
        message: 'Leo is live now.',
        timestamp: '1/10/2026, 7:02 PM',
      },
      {
        id: 'n5',
        isRead: false,
        avatarFallback: 'N',
        typeEmoji: '⭐',
        message: 'NightOwl leveled up!',
        timestamp: '1/9/2026, 11:18 AM',
      },
      {
        id: 'n6',
        isRead: true,
        avatarFallback: 'C',
        typeEmoji: '💰',
        message: 'Purchase confirmed.',
        timestamp: '1/9/2026, 9:06 AM',
      },
      {
        id: 'n7',
        isRead: true,
        avatarFallback: 'M',
        typeEmoji: '💎',
        message: 'Conversion completed.',
        timestamp: '1/8/2026, 6:32 PM',
      },
      {
        id: 'n8',
        isRead: false,
        avatarFallback: 'T',
        typeEmoji: '🔔',
        message: 'System update: new features are rolling out.',
        timestamp: '1/8/2026, 1:22 PM',
      },
      {
        id: 'n9',
        isRead: true,
        avatarFallback: 'R',
        typeEmoji: '💬',
        message: 'Riley replied to your comment.',
        timestamp: '1/7/2026, 4:08 PM',
      },
      {
        id: 'n10',
        isRead: true,
        avatarFallback: 'J',
        typeEmoji: '👤',
        message: 'Jordan started following you.',
        timestamp: '1/7/2026, 1:09 PM',
      },
      {
        id: 'n11',
        isRead: true,
        avatarFallback: 'K',
        typeEmoji: '🎁',
        message: 'You received a gift during your stream.',
        timestamp: '1/6/2026, 8:27 AM',
      },
      {
        id: 'n12',
        isRead: false,
        avatarFallback: 'E',
        typeEmoji: '🔔',
        message: 'Reminder: complete your profile to get discovered.',
        timestamp: '1/6/2026, 7:55 AM',
      },
    ],
    []
  );

  const bottomGuard = insets.bottom + 88;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={noties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotieRow item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomGuard }]}
        ListHeaderComponent={
          <View style={styles.container}>
            <View style={styles.pageHeader}>
              <View style={styles.pageHeaderTopRow}>
                <View style={styles.pageHeaderTitleRow}>
                  <Feather name="bell" size={20} color={stylesVars.primary} />
                  <Text style={styles.pageTitle}>Notifications</Text>
                </View>

                {noties.length > 0 ? (
                  <Pressable accessibilityRole="button" onPress={() => {}} style={styles.markAllBtn}>
                    <Text style={styles.markAllBtnText}>Mark all read</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.pageSubtitle}>Stay updated with your activity</Text>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState />}
        ItemSeparatorComponent={() => <View style={styles.itemSpacer} />}
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
  primary: '#4F46E5',
  unreadBg: 'rgba(79,70,229,0.06)',
  unreadBorder: 'rgba(79,70,229,0.20)',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  listContent: {
    paddingTop: 16,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },

  pageHeader: {
    marginBottom: 12,
  },
  pageHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 12,
  },
  pageHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: stylesVars.mutedText,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllBtnText: {
    fontSize: 13,
    color: stylesVars.primary,
    fontWeight: '700',
  },

  itemSpacer: {
    height: 8,
  },

  notieCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  notieCardPressed: {
    opacity: 0.85,
  },

  notieRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.card,
  },
  notieRowRead: {
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.card,
  },
  notieRowUnread: {
    borderColor: stylesVars.unreadBorder,
    backgroundColor: stylesVars.unreadBg,
  },

  avatarWrap: {
    width: 40,
    height: 40,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    fontSize: 12,
    lineHeight: 14,
  },

  notieContent: {
    flex: 1,
    minWidth: 0,
  },
  notieMessage: {
    fontSize: 14,
    lineHeight: 18,
    color: stylesVars.text,
  },
  notieTimestamp: {
    fontSize: 12,
    color: stylesVars.mutedText,
    marginTop: 4,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: stylesVars.primary,
    marginTop: 4,
  },

  emptyState: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: stylesVars.text,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 12,
    color: stylesVars.mutedText,
    textAlign: 'center',
  },
});

