import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PageShell } from '../components/ui';
import {
  type LiveTVGenderFilter,
  LiveTVHorizontalRail,
  LiveTVRoomChannelCard,
  type LiveTVRoomChannel,
  StreamCard,
  type Stream,
} from '../components/livetv';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { LiveRoomScreen } from './LiveRoomScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Rooms'>;

const SPECIAL_FILTERS = ['Trending', 'Featured', 'Rooms', 'Battles'];
const CATEGORY_FILTERS = ['IRL', 'Music', 'Gaming', 'Comedy', 'Just Chatting'];
const ALL_FILTERS = [...SPECIAL_FILTERS, ...CATEGORY_FILTERS];
const CATEGORY_TABS = ['Music', 'Comedy', 'Gaming', 'IRL', 'Battles', 'Sports', 'Local'];

type RailKey =
  | 'TrendingGrid'
  | 'FeaturedGrid'
  | 'BattlesGrid'
  | 'RoomsJustChatting'
  | 'RoomsMusic'
  | 'RoomsGaming'
  | 'RoomsComedy'
  | 'CategoryTrending'
  | 'CategoryNew'
  | 'CategoryNearby';

type RailItem = {
  key: RailKey;
};

function formatLabelCategoryRail(titlePrefix: string, category: string) {
  return `${titlePrefix} in ${category}`;
}

export function LiveTVScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [liveRoomEnabled, setLiveRoomEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('Trending');
  const [genderFilter, setGenderFilter] = useState<LiveTVGenderFilter>('All');
  const [uiLoading, setUiLoading] = useState(true);

  // Mock data for UI display (no backend wiring)
  const mockStreams: Stream[] = [
    {
      id: '1',
      slug: 'stream-1',
      streamer_display_name: 'ComedyKing',
      thumbnail_url: null,
      viewer_count: 1234,
      category: 'Comedy',
      badges: ['Featured'],
      gender: 'Men',
    },
    {
      id: '2',
      slug: 'stream-2',
      streamer_display_name: 'MusicMaven',
      thumbnail_url: null,
      viewer_count: 856,
      category: 'Music',
      badges: ['Sponsored'],
      gender: 'Women',
    },
    {
      id: '3',
      slug: 'stream-3',
      streamer_display_name: 'NewStreamer',
      thumbnail_url: null,
      viewer_count: 234,
      category: 'Gaming',
      badges: ['Trending'],
      gender: 'Women',
    },
    {
      id: '4',
      slug: 'stream-4',
      streamer_display_name: 'IRLWalker',
      thumbnail_url: null,
      viewer_count: 4412,
      category: 'IRL',
      badges: ['Trending'],
      gender: 'Men',
    },
    {
      id: '5',
      slug: 'stream-5',
      streamer_display_name: 'BattleBoss',
      thumbnail_url: null,
      viewer_count: 982,
      category: 'Battles',
      badges: ['Featured'],
      gender: 'Men',
    },
    {
      id: '6',
      slug: 'stream-6',
      streamer_display_name: 'ChillVibes',
      thumbnail_url: null,
      viewer_count: 1567,
      category: 'Just Chatting',
      badges: ['Trending'],
      gender: 'Women',
    },
    {
      id: '7',
      slug: 'stream-7',
      streamer_display_name: 'TalkShowHost',
      thumbnail_url: null,
      viewer_count: 892,
      category: 'Just Chatting',
      badges: ['Featured'],
      gender: 'Men',
    },
    {
      id: '8',
      slug: 'stream-8',
      streamer_display_name: 'CasualChat',
      thumbnail_url: null,
      viewer_count: 445,
      category: 'Just Chatting',
      badges: [],
      gender: 'Women',
    },
    {
      id: '9',
      slug: 'stream-9',
      streamer_display_name: 'JustTalking',
      thumbnail_url: null,
      viewer_count: 678,
      category: 'Just Chatting',
      badges: ['Trending'],
      gender: 'Men',
    },
    {
      id: '10',
      slug: 'stream-10',
      streamer_display_name: 'ChatMaster',
      thumbnail_url: null,
      viewer_count: 321,
      category: 'Just Chatting',
      badges: [],
      gender: 'Women',
    },
  ];

  const mockRoomChannels: LiveTVRoomChannel[] = [
    {
      id: 'r1',
      name: 'Comedy Room',
      liveNowCount: 12,
      categoryIcon: '🎤',
      avatars: [
        { id: 'a1', label: 'A' },
        { id: 'a2', label: 'B' },
        { id: 'a3', label: 'C' },
        { id: 'a4', label: 'D' },
      ],
      gender: 'Men',
    },
    {
      id: 'r2',
      name: 'Music Room',
      liveNowCount: 7,
      categoryIcon: '🎵',
      avatars: [
        { id: 'a5', label: 'M' },
        { id: 'a6', label: 'N' },
        { id: 'a7', label: 'O' },
      ],
      gender: 'Women',
    },
    {
      id: 'r3',
      name: 'Gaming Room',
      liveNowCount: 15,
      categoryIcon: '🎮',
      avatars: [
        { id: 'a8', label: 'X' },
        { id: 'a9', label: 'Y' },
        { id: 'a10', label: 'Z' },
        { id: 'a11', label: 'Q' },
        { id: 'a12', label: 'R' },
      ],
      gender: 'Men',
    },
    {
      id: 'r4',
      name: 'Battle Arena',
      liveNowCount: 8,
      categoryIcon: '⚔️',
      avatars: [
        { id: 'a13', label: 'P' },
        { id: 'a14', label: 'K' },
        { id: 'a15', label: 'L' },
      ],
      gender: 'Women',
    },
    {
      id: 'r5',
      name: 'Just Chatting Room',
      liveNowCount: 24,
      categoryIcon: '💬',
      avatars: [
        { id: 'a16', label: 'S' },
        { id: 'a17', label: 'T' },
        { id: 'a18', label: 'U' },
        { id: 'a19', label: 'V' },
      ],
      gender: 'Men',
    },
    {
      id: 'r6',
      name: 'Chill Chat Room',
      liveNowCount: 18,
      categoryIcon: '💬',
      avatars: [
        { id: 'a20', label: 'W' },
        { id: 'a21', label: 'H' },
        { id: 'a22', label: 'J' },
      ],
      gender: 'Women',
    },
  ];

  const applyGenderFilter = useCallback(
    <T extends { gender?: 'Men' | 'Women' }>(items: T[]) => {
      if (genderFilter === 'All') return items;
      return items.filter((i) => i.gender === genderFilter);
    },
    [genderFilter]
  );

  const streamsByGender = useMemo(() => applyGenderFilter(mockStreams), [applyGenderFilter, mockStreams]);
  const roomsByGender = useMemo(() => applyGenderFilter(mockRoomChannels), [applyGenderFilter, mockRoomChannels]);

  // All streams sorted by viewer count (for Trending page)
  const allStreamsSortedByPopularity = useMemo(
    () => streamsByGender.slice().sort((a, b) => b.viewer_count - a.viewer_count),
    [streamsByGender]
  );
  
  // Featured streams (for Featured page)
  const featuredStreams = useMemo(
    () => streamsByGender.filter((s) => (s.badges ?? []).includes('Featured')),
    [streamsByGender]
  );

  // Battle streams (for Battles page) - sorted by popularity
  const battlesStreams = useMemo(
    () => streamsByGender
      .filter((s) => s.category === 'Battles')
      .sort((a, b) => b.viewer_count - a.viewer_count),
    [streamsByGender]
  );

  // Room channels organized by category
  const roomsByCategory = useCallback((category: string) => {
    return roomsByGender.filter((r) => {
      // Filter by actual room name/category
      if (category === 'Just Chatting') return r.name.toLowerCase().includes('chat');
      if (category === 'Music') return r.name.toLowerCase().includes('music');
      if (category === 'Gaming') return r.name.toLowerCase().includes('gaming');
      if (category === 'Comedy') return r.name.toLowerCase().includes('comedy');
      return true;
    });
  }, [roomsByGender]);

  // For category pages: filter by category and create rails
  const getCategoryStreams = useCallback((category: string) => {
    return streamsByGender.filter((s) => s.category === category);
  }, [streamsByGender]);

  const categoryTrendingRail = useMemo(() => {
    if (!CATEGORY_FILTERS.includes(activeQuickFilter)) return [];
    const categoryStreams = getCategoryStreams(activeQuickFilter);
    return categoryStreams.filter((s) => (s.badges ?? []).includes('Trending'));
  }, [activeQuickFilter, getCategoryStreams]);

  const categoryNewRail = useMemo(() => {
    if (!CATEGORY_FILTERS.includes(activeQuickFilter)) return [];
    const categoryStreams = getCategoryStreams(activeQuickFilter);
    return categoryStreams.slice(0, 8); // Mock "new" streams
  }, [activeQuickFilter, getCategoryStreams]);

  const categoryNearbyRail = useMemo(() => {
    if (!CATEGORY_FILTERS.includes(activeQuickFilter)) return [];
    const categoryStreams = getCategoryStreams(activeQuickFilter);
    return categoryStreams.slice().sort((a, b) => b.viewer_count - a.viewer_count).slice(0, 8);
  }, [activeQuickFilter, getCategoryStreams]);

  const handleStreamPress = useCallback(
    (stream: Stream) => {
      // Navigate to existing view/join flow (hooks into existing LiveRoomScreen)
      console.log('Stream pressed:', stream.slug);
      setLiveRoomEnabled(true);
    },
    []
  );

  const handleRoomPress = useCallback((room: LiveTVRoomChannel) => {
    console.log('Room pressed:', room.id);
    setLiveRoomEnabled(true);
  }, []);

  const railItems = useMemo((): RailItem[] => {
    // Trending = full page vertical grid of all streams sorted by popularity
    if (activeQuickFilter === 'Trending') {
      return [{ key: 'TrendingGrid' }];
    }
    
    // Featured = full page vertical grid of featured streams
    if (activeQuickFilter === 'Featured') {
      return [{ key: 'FeaturedGrid' }];
    }
    
    // Battles = full page vertical grid of battle streams sorted by popularity
    if (activeQuickFilter === 'Battles') {
      return [{ key: 'BattlesGrid' }];
    }
    
    // Rooms = multiple horizontal rails by room category
    if (activeQuickFilter === 'Rooms') {
      return [
        { key: 'RoomsJustChatting' },
        { key: 'RoomsMusic' },
        { key: 'RoomsGaming' },
        { key: 'RoomsComedy' },
      ];
    }
    
    // Category filters (IRL, Music, Gaming, etc.) = 3 horizontal rails
    if (CATEGORY_FILTERS.includes(activeQuickFilter)) {
      return [
        { key: 'CategoryTrending' },
        { key: 'CategoryNew' },
        { key: 'CategoryNearby' },
      ];
    }
    
    // Fallback to Trending
    return [{ key: 'TrendingGrid' }];
  }, [activeQuickFilter]);

  useEffect(() => {
    setUiLoading(true);
    const timeoutId = setTimeout(() => setUiLoading(false), 550);
    return () => clearTimeout(timeoutId);
  }, [activeQuickFilter, genderFilter]);

  // If LiveRoom is active, show it fullscreen WITHOUT PageShell
  if (liveRoomEnabled) {
    return (
      <LiveRoomScreen
        enabled={true}
        onExitLive={() => setLiveRoomEnabled(false)}
        onNavigateToRooms={() => {
          setLiveRoomEnabled(false);
        }}
        onNavigateWallet={() => {
          setLiveRoomEnabled(false);
          navigation.navigate('Wallet');
        }}
      />
    );
  }

  return (
    <PageShell 
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={() => navigation.navigate('MainTabs', { screen: 'Home' })}
      onNavigateToProfile={(username) => {
        navigation.navigate('MainTabs', { screen: 'Profile', params: { username } });
      }}
    >
      <FlatList<RailItem>
        data={railItems}
        keyExtractor={(item) => item.key}
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <View style={styles.stickyTopBar}>
            {/* Title + Search Row */}
            <View style={styles.titleSearchRow}>
              <Text style={styles.title}>LiveTV</Text>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.filtersContainer}>
              {/* Group 1: Special Filters (Larger, Prominent) */}
              <View style={styles.specialFiltersGroup}>
                {SPECIAL_FILTERS.map((filter) => (
                  <Pressable
                    key={filter}
                    onPress={() => setActiveQuickFilter(filter)}
                    style={[
                      styles.specialFilterButton,
                      activeQuickFilter === filter && styles.specialFilterButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.specialFilterButtonText,
                        activeQuickFilter === filter && styles.specialFilterButtonTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Group 2: Category Filters (Smaller, Evenly Spread) */}
              <View style={styles.categoryFiltersGroup}>
                {CATEGORY_FILTERS.map((filter) => (
                  <Pressable
                    key={filter}
                    onPress={() => setActiveQuickFilter(filter)}
                    style={[
                      styles.categoryFilterButton,
                      activeQuickFilter === filter && styles.categoryFilterButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryFilterButtonText,
                        activeQuickFilter === filter && styles.categoryFilterButtonTextActive,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {filter}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Gender Filter - Spread with Color Coding */}
              <View style={styles.genderFilterGroup}>
                <Pressable
                  onPress={() => setGenderFilter('All')}
                  style={[
                    styles.genderFilterButton,
                    genderFilter === 'All' && styles.genderFilterButtonAll,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderFilterButtonText,
                      genderFilter === 'All' && styles.genderFilterButtonTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setGenderFilter('Men')}
                  style={[
                    styles.genderFilterButton,
                    genderFilter === 'Men' && styles.genderFilterButtonMen,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderFilterButtonText,
                      genderFilter === 'Men' && styles.genderFilterButtonTextActive,
                    ]}
                  >
                    Men
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setGenderFilter('Women')}
                  style={[
                    styles.genderFilterButton,
                    genderFilter === 'Women' && styles.genderFilterButtonWomen,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderFilterButtonText,
                      genderFilter === 'Women' && styles.genderFilterButtonTextActive,
                    ]}
                  >
                    Women
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          switch (item.key) {
            case 'TrendingGrid':
              return (
                <View style={styles.trendingGrid}>
                  <Text style={styles.trendingGridTitle}>Trending Now</Text>
                  {uiLoading ? (
                    <View style={styles.gridContainer}>
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <View key={`trending-skeleton-${idx}`} style={styles.gridItemSkeleton} />
                      ))}
                    </View>
                  ) : allStreamsSortedByPopularity.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <Text style={styles.emptyStateIcon}>📈</Text>
                      <Text style={styles.emptyStateTitle}>No streams available</Text>
                      <Text style={styles.emptyStateSubtitle}>Check back soon for live content</Text>
                    </View>
                  ) : (
                    <View style={styles.gridContainer}>
                      {allStreamsSortedByPopularity.map((stream) => (
                        <View key={stream.id} style={styles.gridItemWrapper}>
                          <StreamCard stream={stream} onPress={handleStreamPress} flexibleWidth />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
              
            case 'FeaturedGrid':
              return (
                <View style={styles.trendingGrid}>
                  <Text style={styles.trendingGridTitle}>Featured Streamers</Text>
                  {uiLoading ? (
                    <View style={styles.gridContainer}>
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <View key={`featured-skeleton-${idx}`} style={styles.gridItemSkeleton} />
                      ))}
                    </View>
                  ) : featuredStreams.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <Text style={styles.emptyStateIcon}>⭐</Text>
                      <Text style={styles.emptyStateTitle}>No featured streams</Text>
                      <Text style={styles.emptyStateSubtitle}>Check back soon for featured content</Text>
                    </View>
                  ) : (
                    <View style={styles.gridContainer}>
                      {featuredStreams.map((stream) => (
                        <View key={stream.id} style={styles.gridItemWrapper}>
                          <StreamCard stream={stream} onPress={handleStreamPress} flexibleWidth />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
              
            case 'BattlesGrid':
              return (
                <View style={styles.battlesGrid}>
                  <Text style={styles.trendingGridTitle}>Live Battles</Text>
                  {uiLoading ? (
                    <View style={styles.battlesContainer}>
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <View key={`battles-skeleton-${idx}`} style={styles.battleCardSkeleton} />
                      ))}
                    </View>
                  ) : battlesStreams.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <Text style={styles.emptyStateIcon}>⚔️</Text>
                      <Text style={styles.emptyStateTitle}>No battles right now</Text>
                      <Text style={styles.emptyStateSubtitle}>Check back soon for epic battles</Text>
                    </View>
                  ) : (
                    <View style={styles.battlesContainer}>
                      {battlesStreams.map((stream) => (
                        <Pressable
                          key={stream.id}
                          onPress={() => handleStreamPress(stream)}
                          style={styles.battleCard}
                        >
                          {/* Battle Card with 2 users side by side */}
                          <View style={styles.battleCardContent}>
                            {/* User 1 - Left Side */}
                            <View style={styles.battleUserLeft}>
                              <View style={styles.battleAvatarBlue}>
                                <Text style={styles.battleAvatarText}>
                                  {stream.streamer_display_name.slice(0, 1)}
                                </Text>
                              </View>
                              <Text style={styles.battleUserName} numberOfLines={1}>
                                {stream.streamer_display_name}
                              </Text>
                              <View style={styles.battleViewerBadge}>
                                <View style={styles.battleDotBlue} />
                                <Text style={styles.battleViewerText}>
                                  {Math.floor(stream.viewer_count * 0.6)}
                                </Text>
                              </View>
                            </View>
                            
                            {/* VS Divider */}
                            <View style={styles.battleVsDivider}>
                              <View style={styles.battleVsCircle}>
                                <Text style={styles.battleVsText}>VS</Text>
                              </View>
                            </View>
                            
                            {/* User 2 - Right Side */}
                            <View style={styles.battleUserRight}>
                              <View style={styles.battleAvatarRed}>
                                <Text style={styles.battleAvatarText}>
                                  {stream.streamer_display_name.slice(-1)}
                                </Text>
                              </View>
                              <Text style={styles.battleUserName} numberOfLines={1}>
                                Opponent
                              </Text>
                              <View style={styles.battleViewerBadge}>
                                <View style={styles.battleDotRed} />
                                <Text style={styles.battleViewerText}>
                                  {Math.floor(stream.viewer_count * 0.4)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          
                          {/* Battle Info Footer */}
                          <View style={styles.battleFooter}>
                            <View style={styles.battleFooterLeft}>
                              <Text style={styles.battleIcon}>⚔️</Text>
                              <Text style={styles.battleLiveText}>LIVE BATTLE</Text>
                            </View>
                            <View style={styles.battleTotalBadge}>
                              <Text style={styles.battleTotalLabel}>Total:</Text>
                              <Text style={styles.battleTotalValue}>{stream.viewer_count}</Text>
                            </View>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
              
            case 'RoomsJustChatting':
              return (
                <LiveTVHorizontalRail
                  title="Just Chatting Rooms"
                  data={roomsByCategory('Just Chatting')}
                  loading={uiLoading}
                  itemWidth={232}
                  keyExtractor={(r) => r.id}
                  renderItem={({ item: room }) => (
                    <LiveTVRoomChannelCard room={room} onPress={handleRoomPress} />
                  )}
                />
              );
              
            case 'RoomsMusic':
              return (
                <LiveTVHorizontalRail
                  title="Music Rooms"
                  data={roomsByCategory('Music')}
                  loading={uiLoading}
                  itemWidth={232}
                  keyExtractor={(r) => r.id}
                  renderItem={({ item: room }) => (
                    <LiveTVRoomChannelCard room={room} onPress={handleRoomPress} />
                  )}
                />
              );
              
            case 'RoomsGaming':
              return (
                <LiveTVHorizontalRail
                  title="Gaming Rooms"
                  data={roomsByCategory('Gaming')}
                  loading={uiLoading}
                  itemWidth={232}
                  keyExtractor={(r) => r.id}
                  renderItem={({ item: room }) => (
                    <LiveTVRoomChannelCard room={room} onPress={handleRoomPress} />
                  )}
                />
              );
              
            case 'RoomsComedy':
              return (
                <LiveTVHorizontalRail
                  title="Comedy Rooms"
                  data={roomsByCategory('Comedy')}
                  loading={uiLoading}
                  itemWidth={232}
                  keyExtractor={(r) => r.id}
                  renderItem={({ item: room }) => (
                    <LiveTVRoomChannelCard room={room} onPress={handleRoomPress} />
                  )}
                />
              );
              
            case 'CategoryTrending':
              return (
                <LiveTVHorizontalRail
                  title="Trending"
                  data={categoryTrendingRail}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
              
            case 'CategoryNew':
              return (
                <LiveTVHorizontalRail
                  title="New"
                  data={categoryNewRail}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
              
            case 'CategoryNearby':
              return (
                <LiveTVHorizontalRail
                  title="Nearby"
                  data={categoryNearbyRail}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
              
            default:
              return null;
          }
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        windowSize={7}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      />
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  const skeletonBase = theme.mode === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.07)';
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    content: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    listContent: {
      paddingBottom: 26,
    },
    stickyTopBar: {
      backgroundColor: theme.tokens.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: 10,
    },
    titleSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.5,
      flexShrink: 0,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 10,
      height: 36,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity * 0.5,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    searchIcon: {
      fontSize: 14,
      marginRight: 6,
      opacity: 0.5,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    clearButton: {
      padding: 4,
    },
    clearIcon: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontWeight: '700',
    },
    filtersContainer: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
    },
    // Special Filters (Larger, Prominent)
    specialFiltersGroup: {
      flexDirection: 'row',
      gap: 10,
    },
    specialFilterButton: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.border + '60',
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity * 0.6,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    specialFilterButtonActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
      shadowOpacity: cardShadow.opacity,
      shadowColor: theme.colors.accent,
    },
    specialFilterButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    specialFilterButtonTextActive: {
      color: '#fff',
    },
    // Category Filters (Smaller, Evenly Spread)
    categoryFiltersGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    categoryFilterButton: {
      flex: 1,
      paddingHorizontal: 6,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border + '60',
      backgroundColor: theme.colors.surface + 'B0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryFilterButtonActive: {
      backgroundColor: theme.colors.primary + 'E6',
      borderColor: theme.colors.primary + 'E6',
    },
    categoryFilterButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    categoryFilterButtonTextActive: {
      color: '#fff',
      fontWeight: '900',
    },
    // Gender Filter (Spread with Color Coding)
    genderFilterGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    genderFilterButton: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border + '60',
      backgroundColor: theme.colors.surface + 'B0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    genderFilterButtonAll: {
      backgroundColor: '#6B7280', // Gray 500
      borderColor: '#6B7280',
    },
    genderFilterButtonMen: {
      backgroundColor: '#3B82F6', // Blue 500
      borderColor: '#3B82F6',
    },
    genderFilterButtonWomen: {
      backgroundColor: '#EC4899', // Pink 500
      borderColor: '#EC4899',
    },
    genderFilterButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    genderFilterButtonTextActive: {
      color: '#fff',
      fontWeight: '900',
    },
    trendingGrid: {
      paddingTop: 8,
      paddingHorizontal: 16,
    },
    trendingGridTitle: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.4,
      marginBottom: 12,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'space-between',
    },
    gridItemWrapper: {
      width: '48%', // 2 columns with gap
    },
    gridItemSkeleton: {
      width: '48%',
      aspectRatio: 3 / 4,
      backgroundColor: skeletonBase,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyStateCard: {
      paddingVertical: 32,
      paddingHorizontal: 24,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: 12,
      opacity: 0.6,
    },
    emptyStateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 6,
      textAlign: 'center',
    },
    emptyStateSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 18,
    },
    // Battles Grid Styles
    battlesGrid: {
      paddingTop: 8,
      paddingHorizontal: 16,
    },
    battlesContainer: {
      gap: 16,
    },
    battleCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    battleCardSkeleton: {
      height: 180,
      backgroundColor: skeletonBase,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    battleCardContent: {
      flexDirection: 'row',
      height: 160,
    },
    battleUserLeft: {
      flex: 1,
      backgroundColor: theme.mode === 'light' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border + '80',
    },
    battleUserRight: {
      flex: 1,
      backgroundColor: theme.mode === 'light' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border + '80',
    },
    battleAvatarBlue: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#3B82F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      shadowColor: '#3B82F6',
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    battleAvatarRed: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      shadowColor: '#EF4444',
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    battleAvatarText: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '900',
    },
    battleUserName: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 6,
    },
    battleViewerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    battleDotBlue: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#60A5FA',
    },
    battleDotRed: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#F87171',
    },
    battleViewerText: {
      color: theme.colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    battleVsDivider: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{ translateX: -28 }, { translateY: -28 }],
      zIndex: 10,
    },
    battleVsCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#9333EA',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: theme.tokens.backgroundPrimary,
      shadowColor: '#9333EA',
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    battleVsText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
    },
    battleFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.mode === 'light' ? 'rgba(168, 85, 247, 0.06)' : 'rgba(168, 85, 247, 0.12)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border + '80',
    },
    battleFooterLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    battleIcon: {
      fontSize: 18,
    },
    battleLiveText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    battleTotalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.tokens.backgroundPrimary + 'CC',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    battleTotalLabel: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
    },
    battleTotalValue: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '900',
    },
  });
}



