import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type MockPost = {
  id: string;
  authorName: string;
  authorUsername: string;
  timestamp: string;
  content: string;
  hasMedia?: boolean;
  reactionsCount: number;
  viewsCount: number;
};

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function FeedPostCard({ post }: { post: MockPost }) {
  const initial = (post.authorName || post.authorUsername || '?').trim().slice(0, 1).toUpperCase();

  return (
    <Card>
      <View style={styles.postHeaderRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial || '•'}</Text>
        </View>

        <View style={styles.postHeaderTextCol}>
          <Text style={styles.postAuthorName}>{post.authorName}</Text>
          <Text style={styles.postTimestamp}>{post.timestamp}</Text>
        </View>

        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Feather name="more-horizontal" size={18} color={stylesVars.mutedText} />
        </Pressable>
      </View>

      <View style={styles.postBody}>
        <Text style={styles.postContent}>{post.content}</Text>
      </View>

      {post.hasMedia ? (
        <View style={styles.mediaPlaceholder}>
          <Feather name="image" size={18} color={stylesVars.mutedText} />
          <Text style={styles.mediaPlaceholderText}>Image</Text>
        </View>
      ) : null}

      <View style={styles.postActionsRow}>
        <Pressable accessibilityRole="button" style={styles.actionButton}>
          <Feather name="heart" size={18} color={stylesVars.mutedText} />
          <Text style={styles.actionButtonText}>Like</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.actionButton}>
          <Feather name="message-circle" size={18} color={stylesVars.mutedText} />
          <Text style={styles.actionButtonText}>Comment</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.actionButton}>
          <Feather name="gift" size={18} color={stylesVars.mutedText} />
          <Text style={styles.actionButtonText}>Gift</Text>
        </Pressable>
      </View>

      <View style={styles.reactionsRow}>
        <Text style={styles.reactionsText}>{post.reactionsCount} reactions</Text>
        <View style={styles.viewsRow}>
          <Feather name="eye" size={14} color={stylesVars.mutedText} />
          <Text style={styles.viewsText}>{post.viewsCount.toLocaleString()} views</Text>
        </View>
      </View>
    </Card>
  );
}

export default function UserFeedScreen() {
  const insets = useSafeAreaInsets();

  const posts = useMemo<MockPost[]>(
    () => [
      {
        id: 'u1',
        authorName: 'StreamQueen',
        authorUsername: 'streamqueen',
        timestamp: 'Jan 10 • 9:41 PM',
        content: 'Post from this user. This is a placeholder for user-specific posts.',
        hasMedia: true,
        reactionsCount: 48,
        viewsCount: 9821,
      },
      {
        id: 'u2',
        authorName: 'StreamQueen',
        authorUsername: 'streamqueen',
        timestamp: 'Jan 8 • 3:22 PM',
        content: 'Another post from the same user. User feed shows only posts by this profile.',
        reactionsCount: 22,
        viewsCount: 3310,
      },
      {
        id: 'u3',
        authorName: 'StreamQueen',
        authorUsername: 'streamqueen',
        timestamp: 'Jan 6 • 11:05 AM',
        content: 'Text-only post from user. Actions row: Like / Comment / Gift.',
        reactionsCount: 7,
        viewsCount: 640,
      },
    ],
    []
  );

  const bottomGuard = insets.bottom + 88;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomGuard }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* User header */}
          <View style={styles.userHeader}>
            <View style={styles.userAvatarLarge}>
              <Text style={styles.userAvatarLargeText}>S</Text>
            </View>
            <Text style={styles.userName}>StreamQueen</Text>
            <Text style={styles.userUsername}>@streamqueen</Text>
            <View style={styles.userStatsRow}>
              <View style={styles.userStat}>
                <Text style={styles.userStatValue}>142</Text>
                <Text style={styles.userStatLabel}>Posts</Text>
              </View>
              <View style={styles.userStat}>
                <Text style={styles.userStatValue}>2.4K</Text>
                <Text style={styles.userStatLabel}>Followers</Text>
              </View>
              <View style={styles.userStat}>
                <Text style={styles.userStatValue}>318</Text>
                <Text style={styles.userStatLabel}>Following</Text>
              </View>
            </View>
          </View>

          {/* Posts section */}
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>Posts</Text>
            {posts.length > 0 ? (
              <View style={styles.feedList}>
                {posts.map((post) => (
                  <FeedPostCard key={post.id} post={post} />
                ))}
              </View>
            ) : (
              <Card>
                <View style={styles.emptyState}>
                  <Feather name="file-text" size={32} color={stylesVars.mutedText} />
                  <Text style={styles.emptyStateTitle}>No posts yet</Text>
                  <Text style={styles.emptyStateBody}>
                    This user hasn't shared any posts.
                  </Text>
                </View>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>
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
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  scrollContent: {
    paddingTop: 16,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },

  userHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 2,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userAvatarLargeText: {
    fontSize: 32,
    fontWeight: '800',
    color: stylesVars.mutedText,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: stylesVars.mutedText,
    marginBottom: 16,
  },
  userStatsRow: {
    flexDirection: 'row',
    gap: 32,
  },
  userStat: {
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: stylesVars.text,
    marginBottom: 2,
  },
  userStatLabel: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },

  postsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: stylesVars.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 14,
  },

  feedList: {
    marginTop: 2,
  },

  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
    color: stylesVars.mutedText,
  },
  postHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '800',
    color: stylesVars.text,
  },
  postTimestamp: {
    fontSize: 12,
    color: stylesVars.mutedText,
    marginTop: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBody: {
    paddingBottom: 10,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    color: stylesVars.text,
  },
  mediaPlaceholder: {
    height: 180,
    borderRadius: 14,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  mediaPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '700',
  },
  reactionsRow: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactionsText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewsText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: stylesVars.text,
  },
  emptyStateBody: {
    fontSize: 14,
    color: stylesVars.mutedText,
    textAlign: 'center',
  },
});
