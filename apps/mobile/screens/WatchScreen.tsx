import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import WatchTopTabs, { WatchTabId } from '../components/watch/WatchTopTabs';
import WatchModeLabel, { WatchMode } from '../components/watch/WatchModeLabel';
import WatchLiveBadge from '../components/watch/WatchLiveBadge';
import WatchActionStack from '../components/watch/WatchActionStack';
import WatchCaptionOverlay from '../components/watch/WatchCaptionOverlay';
import WatchContentItem from '../components/watch/WatchContentItem';
import WatchCommentsModal from '../components/watch/WatchCommentsModal';
import WatchGiftModal from '../components/watch/WatchGiftModal';
import WatchUploadModal from '../components/watch/WatchUploadModal';
import ShareModal from '../components/ShareModal';
import { useWatchFeed, WatchItem } from '../hooks/useWatchFeed';
import { supabase } from '../lib/supabase';
import { showComingSoon } from '../lib/showComingSoon';

// ============================================================================
// WATCH SCREEN COMPONENT
// ============================================================================

export default function WatchScreen() {
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const viewedItemsRef = useRef<Set<string>>(new Set());
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Global mute state for all videos
  const [globalMuted, setGlobalMuted] = useState(true);

  // Keep screen awake while on Watch screen
  useEffect(() => {
    activateKeepAwakeAsync('watch-screen').catch(() => {});
    return () => {
      deactivateKeepAwake('watch-screen');
    };
  }, []);

  // Modal state for comments, gifts, and share
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [modalTargetItem, setModalTargetItem] = useState<WatchItem | null>(null);

  // Real feed data from RPC
  const {
    items,
    loading,
    refreshing,
    error,
    hasMore,
    loadMore,
    refresh,
    setTab,
    setMode,
    currentTab,
    currentMode,
    currentCreatorProfileId,
    optimisticLike,
    optimisticFavorite,
    optimisticRepost,
    optimisticFollow,
  } = useWatchFeed();

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height);
  }, []);

  // Get currently visible item
  const getCurrentItem = useCallback((): WatchItem | null => {
    if (items.length === 0) return null;
    const idx = Math.max(0, Math.min(currentIndex, items.length - 1));
    return items[idx] || null;
  }, [items, currentIndex]);

  // ============================================================================
  // HORIZONTAL SWIPE MODE DETECTION
  // ============================================================================
  const panResponder = useMemo(() => {
    const SWIPE_THRESHOLD = 60;
    const ANGLE_RATIO = 1.5;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        // Only capture horizontal swipes that meet threshold and angle
        return absDx > SWIPE_THRESHOLD && absDx > absDy * ANGLE_RATIO;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx >= SWIPE_THRESHOLD && absDx > absDy * ANGLE_RATIO) {
          if (dx < 0) {
            // Swipe LEFT (finger right to left) → Live Only or back to All
            if (currentMode === 'creator_only') {
              // In Creator Only, swipe left goes back to All
              setMode('all');
            } else if (currentMode === 'all') {
              // In All, swipe left goes to Live Only
              setMode('live_only');
            }
            // If in live_only, can't go further left
          } else {
            // Swipe RIGHT (finger left to right) → Creator Only or back to All
            if (currentMode === 'live_only') {
              // In Live Only, swipe right goes back to All
              setMode('all');
            } else if (currentMode === 'all') {
              // In All, swipe right goes to Creator Only (current user's content)
              const currentItem = getCurrentItem();
              if (currentItem) {
                setMode('creator_only', currentItem.authorId);
              }
            }
            // If in creator_only, can't go further right
          }
          // Scroll to top on mode change
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
      },
    });
  }, [currentMode, setMode, getCurrentItem]);

  // ============================================================================
  // TAB CHANGE HANDLER
  // ============================================================================
  const handleTabPress = useCallback((tabId: WatchTabId) => {
    setTab(tabId);
    // Scroll to top on tab change
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [setTab]);

  // ============================================================================
  // VIEW TRACKING
  // ============================================================================
  const trackView = useCallback(async (item: WatchItem) => {
    if (viewedItemsRef.current.has(item.id)) return;
    viewedItemsRef.current.add(item.id);

    try {
      const contentType = item.type === 'live' ? 'live_stream' : 'feed_post';
      const contentId = item.postId || item.id;
      
      await supabase.rpc('rpc_track_content_view', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_view_source: 'mobile',
        p_view_type: 'viewport',
      });
    } catch (err) {
      console.warn('[WatchScreen] View tracking error:', err);
    }
  }, []);

  // Track visible item for UI updates + view tracking
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        setCurrentIndex(newIndex);

        // Clear existing timer
        if (viewTimerRef.current) {
          clearTimeout(viewTimerRef.current);
        }

        // Track view after 2s of visibility
        const item = items[newIndex];
        if (item) {
          viewTimerRef.current = setTimeout(() => {
            trackView(item);
          }, 2000);
        }
      }
    },
    [items, trackView]
  );

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
  }), []);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================
  const handleLike = useCallback(async (item: WatchItem) => {
    const itemId = item.postId || item.id;
    optimisticLike(item.id);

    try {
      if (item.type === 'live') {
        // Live stream like via trending RPC
        const { data: liveStream } = await supabase
          .from('live_streams')
          .select('id')
          .eq('profile_id', item.authorId)
          .is('ended_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (liveStream) {
          await supabase.rpc('rpc_live_like_toggle', {
            p_stream_id: liveStream.id,
          });
        }
      } else {
        // Video post like
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existing } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('post_id', itemId)
          .eq('profile_id', user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('post_likes')
            .delete()
            .eq('post_id', itemId)
            .eq('profile_id', user.id);
        } else {
          await supabase
            .from('post_likes')
            .insert({ post_id: itemId, profile_id: user.id });
        }
      }
    } catch (err) {
      console.error('[WatchScreen] Like error:', err);
      optimisticLike(item.id); // Revert
    }
  }, [optimisticLike]);

  const handleFavorite = useCallback(async (item: WatchItem) => {
    const itemId = item.postId || item.id;
    optimisticFavorite(item.id);

    try {
      await supabase.rpc('rpc_toggle_favorite', { p_post_id: itemId });
    } catch (err) {
      console.error('[WatchScreen] Favorite error:', err);
      optimisticFavorite(item.id); // Revert
    }
  }, [optimisticFavorite]);

  const handleRepost = useCallback(async (item: WatchItem) => {
    const itemId = item.postId || item.id;
    optimisticRepost(item.id);

    try {
      await supabase.rpc('rpc_toggle_repost', { p_post_id: itemId });
    } catch (err) {
      console.error('[WatchScreen] Repost error:', err);
      optimisticRepost(item.id); // Revert
    }
  }, [optimisticRepost]);

  const handleFollow = useCallback(async (item: WatchItem) => {
    optimisticFollow(item.authorId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (item.isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followee_id', item.authorId);
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, followee_id: item.authorId });
      }
    } catch (err) {
      console.error('[WatchScreen] Follow error:', err);
      optimisticFollow(item.authorId); // Revert
    }
  }, [optimisticFollow]);

  const handleShare = useCallback((item: WatchItem) => {
    setModalTargetItem(item);
    setShareModalVisible(true);
  }, []);

  const handleComment = useCallback((item: WatchItem) => {
    setModalTargetItem(item);
    setCommentsModalVisible(true);
  }, []);

  const handleGift = useCallback((item: WatchItem) => {
    setModalTargetItem(item);
    setGiftModalVisible(true);
  }, []);

  const handleAvatarPress = useCallback((item: WatchItem) => {
    (navigation as any).navigate('ProfileViewScreen', { username: item.username });
  }, [navigation]);

  const handleUsernamePress = useCallback((item: WatchItem) => {
    (navigation as any).navigate('ProfileViewScreen', { username: item.username });
  }, [navigation]);

  const handleCreate = useCallback(() => {
    // Open upload modal directly (matches web behavior)
    setUploadModalVisible(true);
  }, []);

  const handleLiveItemPress = useCallback((item: WatchItem) => {
    if (item.type === 'live') {
      (navigation as any).navigate('LiveUserScreen', { username: item.username });
    }
  }, [navigation]);

  // ============================================================================
  // RENDER ITEM
  // ============================================================================
  const renderItem = useCallback(
    ({ item, index }: { item: WatchItem; index: number }) => {
      const isLive = item.type === 'live';
      const isVisible = index === currentIndex;
      // Priority: thumbnailUrl > mediaUrl > placeholder (never avatar for content)
      const thumbnailUrl = item.thumbnailUrl || item.mediaUrl || 'https://picsum.photos/seed/default/720/1280';

      return (
        <Pressable onPress={() => isLive && handleLiveItemPress(item)}>
          <WatchContentItem 
            thumbnailUrl={thumbnailUrl} 
            mediaUrl={item.mediaUrl}
            isLive={isLive} 
            isVisible={isVisible}
            isMuted={globalMuted}
            onMuteToggle={() => setGlobalMuted(prev => !prev)}
            height={containerHeight}
          >
            {/* Top section: Tabs + Mode label + Live badge */}
            <View style={styles.topSection}>
              <WatchTopTabs 
                activeTab={currentTab} 
                onTabPress={handleTabPress}
              />

              {/* Mode label + Live badge + Mute toggle row (below tabs) */}
              <View style={styles.secondRow}>
                <View style={styles.secondRowLeft}>
                  <WatchModeLabel mode={currentMode} />
                  <WatchLiveBadge visible={isLive} viewerCount={item.viewerCount} />
                </View>
                {/* Mute toggle button */}
                <Pressable
                  style={styles.muteButton}
                  onPress={() => setGlobalMuted(prev => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={globalMuted ? 'Unmute' : 'Mute'}
                >
                  <Ionicons
                    name={globalMuted ? 'volume-mute' : 'volume-high'}
                    size={20}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            </View>

            {/* Right side: Action stack */}
            <View style={[styles.actionStackContainer, { bottom: 16 }]}>
              <WatchActionStack
                avatarUrl={item.avatarUrl || ''}
                isFollowing={item.isFollowing}
                likeCount={item.likeCount}
                commentCount={item.commentCount}
                favoriteCount={item.favoriteCount}
                shareCount={item.shareCount}
                isLiked={item.isLiked}
                isFavorited={item.isFavorited}
                onAvatarPress={() => handleAvatarPress(item)}
                onFollowPress={() => handleFollow(item)}
                onLikePress={() => handleLike(item)}
                onCommentPress={() => handleComment(item)}
                onGiftPress={() => handleGift(item)}
                onFavoritePress={() => handleFavorite(item)}
                onSharePress={() => handleShare(item)}
                onRepostPress={() => handleRepost(item)}
                onCreatePress={handleCreate}
              />
            </View>

            {/* Bottom: Caption overlay */}
            <View style={[styles.captionContainer, { paddingBottom: 16 }]}>
              <WatchCaptionOverlay
                username={item.username}
                displayName={item.displayName}
                isMllPro={item.isMllPro}
                title={item.title || ''}
                caption={item.caption || ''}
                hashtags={item.hashtags}
                location={item.location || undefined}
                viewCount={item.viewCount}
                onUsernamePress={() => handleUsernamePress(item)}
                onHashtagPress={() => showComingSoon('Hashtag search')}
                onLocationPress={() => showComingSoon('Location search')}
              />
            </View>
          </WatchContentItem>
        </Pressable>
      );
    },
    [
      containerHeight, currentTab, currentMode, currentIndex, globalMuted, handleTabPress,
      handleAvatarPress, handleFollow, handleLike, handleComment,
      handleFavorite, handleShare, handleRepost, handleCreate,
      handleUsernamePress, handleLiveItemPress,
    ]
  );

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading && items.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error && items.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ============================================================================
  // EMPTY STATE
  // ============================================================================
  if (!loading && items.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="videocam-outline" size={48} color="#6B7280" />
        <Text style={styles.emptyText}>No content yet</Text>
        <Text style={styles.emptySubtext}>Be the first to post something!</Text>
        <Pressable style={styles.createButtonEmpty} onPress={handleCreate}>
          <Text style={styles.createButtonEmptyText}>Create Post</Text>
        </Pressable>
      </View>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <View style={styles.container} onLayout={onContainerLayout} {...panResponder.panHandlers}>
      {containerHeight > 0 && (
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={containerHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#EC4899"
              colors={['#EC4899']}
            />
          }
        />
      )}

      {/* Comments Modal */}
      <WatchCommentsModal
        visible={commentsModalVisible}
        onClose={() => setCommentsModalVisible(false)}
        postId={modalTargetItem?.postId || modalTargetItem?.id || null}
        authorUsername={modalTargetItem?.username || ''}
        commentCount={modalTargetItem?.commentCount || 0}
      />

      {/* Gift Modal */}
      <WatchGiftModal
        visible={giftModalVisible}
        onClose={() => setGiftModalVisible(false)}
        recipientId={modalTargetItem?.authorId || ''}
        recipientUsername={modalTargetItem?.username || ''}
        recipientDisplayName={modalTargetItem?.displayName || ''}
        recipientAvatarUrl={modalTargetItem?.avatarUrl || null}
        postId={modalTargetItem?.postId || modalTargetItem?.id || null}
        isLive={modalTargetItem?.type === 'live'}
        liveStreamId={modalTargetItem?.liveStreamId || null}
      />

      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => {
          setShareModalVisible(false);
          setModalTargetItem(null);
        }}
        shareUrl={modalTargetItem?.type === 'live'
          ? `https://www.mylivelinks.com/live/${modalTargetItem?.username}`
          : `https://www.mylivelinks.com/post/${modalTargetItem?.postId || modalTargetItem?.id}`}
        shareText={modalTargetItem?.caption || `Check out ${modalTargetItem?.displayName || modalTargetItem?.username} on MyLiveLinks!`}
        shareThumbnail={
          modalTargetItem?.thumbnailUrl ||
          (modalTargetItem?.mediaUrl && !modalTargetItem.mediaUrl.match(/\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i) ? modalTargetItem.mediaUrl : null) ||
          modalTargetItem?.avatarUrl ||
          null
        }
        shareContentType={modalTargetItem?.type === 'live' ? 'live' : modalTargetItem?.type === 'photo' ? 'photo' : 'video'}
      />

      {/* Upload Modal - Direct upload matching web behavior */}
      <WatchUploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onSuccess={() => {
          setUploadModalVisible(false);
          refresh(); // Refresh feed to show new post
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSection: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  secondRow: {
    marginTop: 4,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionStackContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 20,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 80,
    zIndex: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#EC4899',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
  },
  createButtonEmpty: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#EC4899',
    borderRadius: 8,
  },
  createButtonEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
