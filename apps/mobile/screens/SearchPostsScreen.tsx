import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type PostResult = {
  id: string;
  text_content: string;
  created_at: string;
  media_url: string | null;
  likes_count: number;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
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

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function FeedPostCard({ post, onPress }: { post: PostResult; onPress?: () => void }) {
  const authorName = post.author?.display_name || post.author?.username || 'Unknown';
  const initial = authorName.trim().slice(0, 1).toUpperCase();

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={styles.postHeaderRow}>
          {post.author?.avatar_url ? (
            <Image source={{ uri: post.author.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial || '•'}</Text>
            </View>
          )}

          <View style={styles.postHeaderTextCol}>
            <Text style={styles.postAuthorName} numberOfLines={1}>
              {authorName}
            </Text>
            <Text style={styles.postTimestamp} numberOfLines={1}>
              @{post.author?.username || 'unknown'} • {formatTimeAgo(post.created_at)}
            </Text>
          </View>

          <Pressable accessibilityRole="button" style={styles.iconButton}>
            <Feather name="more-horizontal" size={18} color={stylesVars.mutedText} />
          </Pressable>
        </View>

        <View style={styles.postBody}>
          <Text style={styles.postContent}>{post.text_content}</Text>
        </View>

        {post.media_url ? (
          <Image source={{ uri: post.media_url }} style={styles.mediaImage} resizeMode="cover" />
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
          <Text style={styles.reactionsText}>{post.likes_count} likes</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function EmptyState({ query, loading, error }: { query: string; loading?: boolean; error?: string | null }) {
  if (loading) {
    return (
      <View style={styles.emptyStateWrap}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.emptyStateTitle}>Searching...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.emptyStateWrap}>
        <View style={styles.emptyStateIcon}>
          <Feather name="alert-circle" size={20} color="#EF4444" />
        </View>
        <Text style={styles.emptyStateTitle}>Search failed</Text>
        <Text style={styles.emptyStateBody}>{error}</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyStateWrap} accessibilityRole="text">
      <View style={styles.emptyStateIcon}>
        <Feather name="search" size={20} color={stylesVars.mutedText} />
      </View>
      <Text style={styles.emptyStateTitle}>No posts found</Text>
      <Text style={styles.emptyStateBody}>
        Try a different keyword{query.trim() ? ` for "${query.trim()}".` : '.'}
      </Text>
    </View>
  );
}

export default function SearchPostsScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchPosts = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setPosts([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const likePattern = `%${trimmed.toLowerCase()}%`;
      const { data, error: err } = await supabase
        .from('posts')
        .select(`
          id,
          text_content,
          created_at,
          media_url,
          likes_count,
          author:profiles!posts_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .ilike('text_content', likePattern)
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;
      setPosts((data as unknown as PostResult[]) || []);
    } catch (err: any) {
      console.error('[SearchPostsScreen] Search error:', err);
      setError(err.message || 'Search failed');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPosts(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchPosts]);

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

        {hasSearched && !loading && !error && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Posts</Text>
            <Text style={styles.resultsCount}>{posts.length}</Text>
          </View>
        )}

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedPostCard 
              post={item} 
              onPress={() => item.author?.id && navigation.navigate('ProfileViewScreen' as never, { profileId: item.author.id } as never)}
            />
          )}
          ListEmptyComponent={<EmptyState query={query} loading={loading} error={error} />}
          contentContainerStyle={[
            styles.listContent,
            posts.length === 0 ? styles.listContentEmpty : null,
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
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  mediaImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 10,
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
