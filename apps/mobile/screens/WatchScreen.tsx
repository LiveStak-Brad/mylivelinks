import React, { useCallback, useState } from 'react';
import { FlatList, LayoutChangeEvent, StyleSheet, View, ViewToken } from 'react-native';

import WatchTopTabs, { WatchTabId } from '../components/watch/WatchTopTabs';
import WatchModeLabel, { WatchMode } from '../components/watch/WatchModeLabel';
import WatchLiveBadge from '../components/watch/WatchLiveBadge';
import WatchActionStack from '../components/watch/WatchActionStack';
import WatchCaptionOverlay from '../components/watch/WatchCaptionOverlay';
import WatchContentItem from '../components/watch/WatchContentItem';

// ============================================================================
// MOCK DATA - UI placeholders only
// ============================================================================

export interface WatchItem {
  id: string;
  type: 'video' | 'live';
  thumbnailUrl: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isFollowing: boolean;
  title: string;
  caption: string;
  hashtags: string[];
  location?: string;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  shareCount: number;
  isLive: boolean;
}

const MOCK_ITEMS: WatchItem[] = [
  {
    id: 'watch-001',
    type: 'live',
    thumbnailUrl: 'https://picsum.photos/seed/watch1/720/1280',
    username: 'creativelive',
    displayName: 'Creative Live',
    avatarUrl: 'https://picsum.photos/seed/avatar1/200/200',
    isFollowing: false,
    title: 'Creative session tonight!',
    caption: 'Live streaming some creative work tonight! Join the vibe and hang out with us.',
    hashtags: ['creative', 'livestream', 'vibes'],
    location: 'Los Angeles, CA',
    likeCount: 1234,
    commentCount: 89,
    favoriteCount: 45,
    shareCount: 12,
    isLive: true,
  },
  {
    id: 'watch-002',
    type: 'video',
    thumbnailUrl: 'https://picsum.photos/seed/watch2/720/1280',
    username: 'musicmaker',
    displayName: 'Music Maker',
    avatarUrl: 'https://picsum.photos/seed/avatar2/200/200',
    isFollowing: true,
    title: 'New track sneak peek',
    caption: 'Here\'s a sneak peek of what I\'ve been working on in the studio. Let me know what you think in the comments!',
    hashtags: ['music', 'newmusic', 'studio', 'producer'],
    likeCount: 5678,
    commentCount: 234,
    favoriteCount: 123,
    shareCount: 67,
    isLive: false,
  },
  {
    id: 'watch-003',
    type: 'video',
    thumbnailUrl: 'https://picsum.photos/seed/watch3/720/1280',
    username: 'comedyking',
    displayName: 'Comedy King',
    avatarUrl: 'https://picsum.photos/seed/avatar3/200/200',
    isFollowing: false,
    title: 'When your mom asks where all your money went',
    caption: 'This is too relatable 😂',
    hashtags: ['comedy', 'funny', 'relatable'],
    location: 'New York, NY',
    likeCount: 15200,
    commentCount: 456,
    favoriteCount: 890,
    shareCount: 234,
    isLive: false,
  },
  {
    id: 'watch-004',
    type: 'live',
    thumbnailUrl: 'https://picsum.photos/seed/watch4/720/1280',
    username: 'gamergirl',
    displayName: 'Gamer Girl',
    avatarUrl: 'https://picsum.photos/seed/avatar4/200/200',
    isFollowing: true,
    title: 'Ranked grind tonight!',
    caption: 'Playing ranked tonight! Come watch the grind',
    hashtags: ['gaming', 'ranked', 'live'],
    likeCount: 892,
    commentCount: 156,
    favoriteCount: 78,
    shareCount: 23,
    isLive: true,
  },
  {
    id: 'watch-005',
    type: 'video',
    thumbnailUrl: 'https://picsum.photos/seed/watch5/720/1280',
    username: 'fitnessfam',
    displayName: 'Fitness Fam',
    avatarUrl: 'https://picsum.photos/seed/avatar5/200/200',
    isFollowing: false,
    title: '10 minute morning workout',
    caption: 'Quick workout you can do anywhere - no equipment needed!',
    hashtags: ['fitness', 'workout', 'health', 'motivation'],
    location: 'Miami, FL',
    likeCount: 8900,
    commentCount: 345,
    favoriteCount: 567,
    shareCount: 189,
    isLive: false,
  },
];

// ============================================================================
// WATCH SCREEN COMPONENT
// ============================================================================

export default function WatchScreen() {
  // UI state only - no logic wired
  const [activeTab, setActiveTab] = useState<WatchTabId>('foryou');
  const [currentMode] = useState<WatchMode>('all'); // Visual only, mode switching wired later
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height);
  }, []);

  // Track visible item for UI updates
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const renderItem = useCallback(
    ({ item }: { item: WatchItem }) => (
      <WatchContentItem thumbnailUrl={item.thumbnailUrl} isLive={item.isLive} height={containerHeight}>
        {/* Top section: Tabs + Mode label + Live badge */}
        <View style={styles.topSection}>
          <WatchTopTabs 
            activeTab={activeTab} 
            onTabPress={setActiveTab}
          />

          {/* Mode label + Live badge row (below tabs) */}
          <View style={styles.secondRow}>
            <View style={styles.secondRowLeft}>
              {/* Non-interactive mode label (swipe modes wired later) */}
              <WatchModeLabel mode={currentMode} />
              <WatchLiveBadge visible={item.isLive} />
            </View>
          </View>
        </View>

        {/* Right side: Action stack */}
        <View style={[styles.actionStackContainer, { bottom: 16 }]}>
          <WatchActionStack
            avatarUrl={item.avatarUrl}
            isFollowing={item.isFollowing}
            likeCount={item.likeCount}
            commentCount={item.commentCount}
            favoriteCount={item.favoriteCount}
            shareCount={item.shareCount}
            // All handlers are placeholders - no logic
            onAvatarPress={() => {}}
            onFollowPress={() => {}}
            onLikePress={() => {}}
            onCommentPress={() => {}}
            onFavoritePress={() => {}}
            onSharePress={() => {}}
            onRepostPress={() => {}}
            onCreatePress={() => {}}
          />
        </View>

        {/* Bottom: Caption overlay */}
        <View style={[styles.captionContainer, { paddingBottom: 16 }]}>
          <WatchCaptionOverlay
            username={item.username}
            displayName={item.displayName}
            title={item.title}
            caption={item.caption}
            hashtags={item.hashtags}
            location={item.location}
            // All handlers are placeholders - no logic
            onUsernamePress={() => {}}
            onHashtagPress={() => {}}
            onLocationPress={() => {}}
          />
        </View>
      </WatchContentItem>
    ),
    [activeTab, currentMode, containerHeight]
  );

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      {containerHeight > 0 && (
        <FlatList
          data={MOCK_ITEMS}
          keyExtractor={(item) => item.id}
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  actionStackContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 20,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 80, // Leave room for action stack
    zIndex: 20,
  },
});
