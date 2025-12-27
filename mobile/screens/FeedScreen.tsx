import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { Button, Input, PageShell } from '../components/ui';
import { useFeed, type FeedPost } from '../hooks/useFeed';
import type { MainTabsParamList } from '../types/navigation';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = BottomTabScreenProps<MainTabsParamList, 'Feed'>;

export function FeedScreen({}: Props) {
  const { posts, nextCursor, isLoading, error, refresh, loadMore } = useFeed();
  const { fetchAuthed } = useFetchAuthed();
  const [composerText, setComposerText] = useState('');
  const [composerLoading, setComposerLoading] = useState(false);

  const canPost = composerText.trim().length > 0 && !composerLoading;
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      const avatarUri = resolveMediaUrl(item.author?.avatar_url ?? null);
      const mediaUri = resolveMediaUrl(item.media_url ?? null);
      return (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>
                  {(item.author?.username || 'U').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
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

          {!!mediaUri && (
            <View style={styles.mediaWrap}>
              <Image source={{ uri: mediaUri }} style={styles.mediaImage} resizeMode="cover" />
            </View>
          )}
        </View>
      );
    },
    [formatDateTime]
  );

  const renderComposer = useMemo(() => {
    return (
      <View style={styles.composerCard}>
        <Input
          placeholder="What's happening?"
          value={composerText}
          onChangeText={setComposerText}
          multiline
          style={styles.composerInput}
        />
        <View style={styles.composerActions}>
          <Button
            title={composerLoading ? 'Posting…' : 'Post'}
            onPress={() => {
              void (async () => {
                const text = composerText.trim();
                if (!text || composerLoading) return;
                setComposerLoading(true);
                try {
                  const res = await fetchAuthed('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text_content: text }),
                  });
                  if (!res.ok) {
                    console.error('[Feed] create post failed:', res.message);
                    return;
                  }
                  setComposerText('');
                  await refresh();
                } finally {
                  setComposerLoading(false);
                }
              })();
            }}
            disabled={!canPost}
            loading={composerLoading}
            style={styles.postButton}
          />
        </View>
      </View>
    );
  }, [canPost, composerLoading, composerText, fetchAuthed, refresh]);

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
          ListHeaderComponent={renderComposer}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && posts.length === 0}
              onRefresh={() => void refresh()}
              tintColor="#5E9BFF"
            />
          }
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

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    listContent: {
      paddingTop: 16,
      paddingBottom: 40,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    separator: {
      height: 12,
    },

    composerCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    composerInput: {
      minHeight: 44,
      paddingTop: 12,
      paddingBottom: 12,
      textAlignVertical: 'top',
    },
    composerActions: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    postButton: {
      paddingHorizontal: 24,
    },

    postCard: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 16,
      marginHorizontal: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
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
    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.06)',
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
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    timestamp: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    metrics: {
      alignItems: 'flex-end',
      gap: 2,
    },
    metricText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    contentText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 22,
    },
    mediaWrap: {
      marginTop: 12,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    mediaImage: {
      width: '100%',
      height: 220,
    },

    stateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 12,
    },
    stateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },
    stateSubtitle: {
      color: theme.colors.textSecondary,
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
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity * 0.8,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: Math.max(2, cardShadow.elevation - 2),
    },
    loadMoreText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    footerSpacer: {
      height: 12,
    },
  });
}

export default FeedScreen;

