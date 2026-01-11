import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
          <Text style={styles.postAuthorName} numberOfLines={1}>
            {post.authorName}
          </Text>
          <Text style={styles.postTimestamp} numberOfLines={1}>
            {post.timestamp}
          </Text>
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

function EmptyState({ query }: { query: string }) {
  return (
    <View style={styles.emptyStateWrap} accessibilityRole="text">
      <View style={styles.emptyStateIcon}>
        <Feather name="search" size={20} color={stylesVars.mutedText} />
      </View>
      <Text style={styles.emptyStateTitle}>No posts found</Text>
      <Text style={styles.emptyStateBody}>
        Try a different keyword{query.trim() ? ` for “${query.trim()}”.` : '.'}
      </Text>
    </View>
  );
}

export default function SearchPostsScreen() {
  const [query, setQuery] = useState('');

  const posts = useMemo<MockPost[]>(
    () => [
      {
        id: 'sp1',
        authorName: 'Creator Name',
        authorUsername: 'creatorname',
        timestamp: 'Jan 11 • 2:05 PM',
        content: 'Searching should feel like the web Posts search: intent-first and fast.',
        reactionsCount: 12,
        viewsCount: 1204,
      },
      {
        id: 'sp2',
        authorName: 'StreamQueen',
        authorUsername: 'streamqueen',
        timestamp: 'Jan 10 • 9:41 PM',
        content: 'Try queries like “image”, “community”, “battle”, or a creator name.',
        hasMedia: true,
        reactionsCount: 48,
        viewsCount: 9821,
      },
      {
        id: 'sp3',
        authorName: 'Brad',
        authorUsername: 'brad',
        timestamp: 'Jan 9 • 11:18 AM',
        content: 'Placeholder actions: Like / Comment / Gift (UI only).',
        reactionsCount: 3,
        viewsCount: 214,
      },
      {
        id: 'sp4',
        authorName: 'NightOwl',
        authorUsername: 'nightowl',
        timestamp: 'Jan 8 • 6:32 PM',
        content: 'Text-only post card. Spacing matches the feed cards for consistency.',
        reactionsCount: 0,
        viewsCount: 89,
      },
      {
        id: 'sp5',
        authorName: 'Ava',
        authorUsername: 'ava',
        timestamp: 'Jan 7 • 1:09 PM',
        content: 'Image placeholder block. Search should surface moments from creators.',
        hasMedia: true,
        reactionsCount: 22,
        viewsCount: 3310,
      },
    ],
    []
  );

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;

    return posts.filter((p) => {
      const haystack = `${p.authorName} ${p.authorUsername} ${p.content}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, query]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderTitleRow}>
            <Feather name="search" size={18} color={stylesVars.primary} />
            <Text style={styles.pageTitle}>Search posts</Text>
          </View>
          <Text style={styles.pageSubtitle}>Find posts by creator or keywords</Text>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={stylesVars.mutedText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search posts…"
            placeholderTextColor={stylesVars.mutedText}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search posts input"
          />
          {query.trim().length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.clearButton}
              onPress={() => setQuery('')}
            >
              <Feather name="x" size={16} color={stylesVars.mutedText} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Posts</Text>
          <Text style={styles.resultsCount}>{filteredPosts.length}</Text>
        </View>

        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedPostCard post={item} />}
          ListEmptyComponent={<EmptyState query={query} />}
          contentContainerStyle={[
            styles.listContent,
            filteredPosts.length === 0 ? styles.listContentEmpty : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
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
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  pageHeader: {
    marginBottom: 10,
  },
  pageHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: stylesVars.mutedText,
    marginLeft: 26,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 46,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: stylesVars.text,
    paddingVertical: 10,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  resultsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '800',
    color: stylesVars.mutedText,
  },

  listContent: {
    paddingBottom: 18,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 0,
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

  emptyStateWrap: {
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  emptyStateIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: stylesVars.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptyStateBody: {
    fontSize: 14,
    color: stylesVars.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
