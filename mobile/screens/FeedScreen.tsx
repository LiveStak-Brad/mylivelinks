import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { Button, PageShell } from '../components/ui';
import { useFeed, type FeedPost } from '../hooks/useFeed';
import type { MainTabsParamList } from '../types/navigation';

type Props = BottomTabScreenProps<MainTabsParamList, 'Feed'>;

export function FeedScreen({}: Props) {
  const { posts, nextCursor, isLoading, error, refresh, loadMore } = useFeed();

  const formatDateTime = useCallback((value: string) => {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => {
      return (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {(item.author?.username || 'U').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.postMeta}>
              <Text style={styles.author} numberOfLines={1}>
                {item.author?.username || 'Unknown'}
              </Text>
              <Text style={styles.timestamp} numberOfLines={1}>
                {formatDateTime(item.created_at)}
              </Text>
            </View>

            <View style={styles.metrics}>
              <Text style={styles.metricText}>💬 {item.comment_count ?? 0}</Text>
              <Text style={styles.metricText}>🎁 {item.gift_total_coins ?? 0}</Text>
            </View>
          </View>

          {!!item.text_content && (
            <Text style={styles.contentText}>{String(item.text_content)}</Text>
          )}

          {!!item.media_url && (
            <View style={styles.mediaStub}>
              <Text style={styles.mediaStubText}>Media attached</Text>
            </View>
          )}
        </View>
      );
    },
    [formatDateTime]
  );

  const keyExtractor = useCallback((item: FeedPost) => item.id, []);

  const onEndReached = useCallback(() => {
    if (isLoading) return;
    if (!nextCursor) return;
    void loadMore();
  }, [isLoading, loadMore, nextCursor]);

  const showEmpty = posts.length === 0 && !isLoading;

  return (
    <PageShell title="Feed" contentStyle={styles.container}>
      {error && posts.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Something went wrong</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
          <Button title="Retry" onPress={() => void refresh()} style={styles.stateButton} />
        </View>
      ) : showEmpty ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No posts yet</Text>
          <Text style={styles.stateSubtitle}>When posts are shared, they’ll appear here.</Text>
          <Button
            title={isLoading ? 'Loading…' : 'Refresh'}
            onPress={() => void refresh()}
            loading={isLoading}
            style={styles.stateButton}
          />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={isLoading && posts.length === 0} onRefresh={() => void refresh()} tintColor="#5E9BFF" />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            isLoading && posts.length > 0 ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color="#5E9BFF" />
              </View>
            ) : nextCursor ? (
              <Pressable style={styles.loadMoreButton} onPress={() => void loadMore()}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
            ) : (
              <View style={styles.footerSpacer} />
            )
          }
        />
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  separator: {
    height: 12,
  },

  postCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5E9BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  postMeta: {
    flex: 1,
    marginLeft: 12,
  },
  author: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  timestamp: {
    color: '#9aa0a6',
    fontSize: 12,
    marginTop: 2,
  },
  metrics: {
    alignItems: 'flex-end',
    gap: 2,
  },
  metricText: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '700',
  },
  contentText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  mediaStub: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mediaStubText: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '700',
  },

  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  stateTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateSubtitle: {
    color: '#9aa0a6',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  stateButton: {
    marginTop: 4,
    paddingHorizontal: 28,
  },

  footerLoading: {
    paddingVertical: 18,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  footerSpacer: {
    height: 12,
  },
});

