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
  LiveTVCategoryTabs,
  LiveTVFindResultRow,
  LiveTVGenderSegmentedControl,
  type LiveTVGenderFilter,
  LiveTVHorizontalRail,
  LiveTVQuickFiltersRow,
  LiveTVRoomChannelCard,
  type LiveTVRoomChannel,
  StreamCard,
  type Stream,
} from '../components/livetv';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { LiveRoomScreen } from './LiveRoomScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Rooms'>;

const QUICK_FILTERS = ['Trending', 'Featured', 'Rooms', 'Popular', 'Followed', 'New', 'Nearby', 'Find'];
const CATEGORY_TABS = ['Music', 'Comedy', 'Gaming', 'IRL', 'Battles', 'Sports', 'Local'];

type RailKey =
  | 'Trending'
  | 'Featured'
  | 'Rooms'
  | 'Popular'
  | 'Followed'
  | 'CategoryTabs'
  | 'CategoryTop'
  | 'CategoryRising'
  | 'NewCreators'
  | 'JustStarted'
  | 'FindResults';

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
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('Music');
  const [findSort, setFindSort] = useState<'Trending' | 'Popular'>('Trending');
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
      name: 'Battle Arena',
      liveNowCount: 5,
      categoryIcon: '⚔️',
      avatars: [
        { id: 'a8', label: 'X' },
        { id: 'a9', label: 'Y' },
        { id: 'a10', label: 'Z' },
        { id: 'a11', label: 'Q' },
        { id: 'a12', label: 'R' },
      ],
      gender: 'Men',
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

  const trendingStreams = useMemo(
    () => streamsByGender.filter((s) => (s.badges ?? []).includes('Trending')),
    [streamsByGender]
  );
  const featuredStreams = useMemo(
    () => streamsByGender.filter((s) => (s.badges ?? []).includes('Featured')),
    [streamsByGender]
  );
  const popularStreams = useMemo(
    () => streamsByGender.slice().sort((a, b) => b.viewer_count - a.viewer_count),
    [streamsByGender]
  );
  const followedStreams = useMemo(() => [] as Stream[], []);

  const findResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query.length === 0
      ? streamsByGender
      : streamsByGender.filter((s) => s.streamer_display_name.toLowerCase().includes(query));
    if (findSort === 'Popular') return filtered.slice().sort((a, b) => b.viewer_count - a.viewer_count);
    return filtered;
  }, [findSort, searchQuery, streamsByGender]);

  const newCreatorsRail = useMemo(() => streamsByGender.slice(0, 3), [streamsByGender]);
  const justStartedRail = useMemo(() => streamsByGender.slice(2, 5), [streamsByGender]);

  const categoryTopRail = useMemo(
    () => popularStreams.filter((s) => s.category === selectedCategoryTab).slice(0, 8),
    [popularStreams, selectedCategoryTab]
  );
  const categoryRisingRail = useMemo(
    () => streamsByGender.filter((s) => s.category === selectedCategoryTab).slice(0, 8),
    [selectedCategoryTab, streamsByGender]
  );

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
    if (activeQuickFilter === 'Find') {
      return [{ key: 'FindResults' }];
    }
    if (activeQuickFilter === 'Nearby') {
      return [
        { key: 'Trending' },
        { key: 'Featured' },
        { key: 'Rooms' },
        { key: 'Popular' },
        { key: 'Followed' },
        { key: 'CategoryTabs' },
        { key: 'CategoryTop' },
      ];
    }
    if (activeQuickFilter === 'New') {
      return [{ key: 'NewCreators' }, { key: 'JustStarted' }];
    }
    return [
      { key: 'Trending' },
      { key: 'Featured' },
      { key: 'Rooms' },
      { key: 'Popular' },
      { key: 'Followed' },
      { key: 'CategoryTabs' },
      { key: 'CategoryTop' },
      { key: 'CategoryRising' },
    ];
  }, [activeQuickFilter]);

  useEffect(() => {
    setUiLoading(true);
    const timeoutId = setTimeout(() => setUiLoading(false), 550);
    return () => clearTimeout(timeoutId);
  }, [activeQuickFilter, genderFilter, selectedCategoryTab]);

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
            <View style={styles.titleBlock}>
              <Text style={styles.title}>LiveTV</Text>
              <Text style={styles.subtitle}>MyLiveLinks presents</Text>
            </View>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search LiveTV"
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

            <LiveTVQuickFiltersRow
              options={QUICK_FILTERS}
              selected={activeQuickFilter}
              onSelect={setActiveQuickFilter}
            />

            <LiveTVGenderSegmentedControl value={genderFilter} onChange={setGenderFilter} />

            {activeQuickFilter === 'Nearby' ? (
              <View style={styles.hintRow}>
                <Text style={styles.hintText}>Using your location</Text>
              </View>
            ) : null}

            {activeQuickFilter === 'Find' ? (
              <View style={styles.findControlsRow}>
                <Pressable style={styles.findButton} onPress={() => console.log('Filter sheet pressed')}>
                  <Text style={styles.findButtonText}>Filter</Text>
                </Pressable>
                <Pressable
                  style={styles.findButton}
                  onPress={() => setFindSort((prev) => (prev === 'Trending' ? 'Popular' : 'Trending'))}
                >
                  <Text style={styles.findButtonText}>Sort: {findSort}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          switch (item.key) {
            case 'Trending':
              return (
                <LiveTVHorizontalRail
                  title="Trending"
                  data={trendingStreams}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
            case 'Featured':
              return (
                <LiveTVHorizontalRail
                  title="Featured"
                  data={featuredStreams}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
            case 'Rooms':
              return (
                <LiveTVHorizontalRail
                  title="Rooms"
                  data={roomsByGender}
                  loading={uiLoading}
                  itemWidth={232}
                  keyExtractor={(r) => r.id}
                  renderItem={({ item: room }) => (
                    <LiveTVRoomChannelCard room={room} onPress={handleRoomPress} />
                  )}
                />
              );
            case 'Popular':
              return (
                <LiveTVHorizontalRail
                  title="Popular"
                  data={popularStreams}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
            case 'Followed':
              return (
                <LiveTVHorizontalRail
                  title="Followed"
                  data={followedStreams}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                  emptyState={
                    <View style={styles.followedEmpty}>
                      <Text style={styles.followedEmptyTitle}>Follow creators to see them here.</Text>
                      <Text style={styles.followedEmptySubtitle}>Your followed creators will show up as they go live.</Text>
                    </View>
                  }
                />
              );
            case 'CategoryTabs':
              return (
                <View style={styles.categoryBlock}>
                  <LiveTVCategoryTabs
                    tabs={CATEGORY_TABS}
                    selected={selectedCategoryTab}
                    onSelect={setSelectedCategoryTab}
                  />
                  <Text style={styles.categoryHeading}>Popular by Category</Text>
                </View>
              );
            case 'CategoryTop':
              return (
                <LiveTVHorizontalRail
                  title={formatLabelCategoryRail('Top', selectedCategoryTab)}
                  data={categoryTopRail}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
            case 'CategoryRising':
              return (
                <LiveTVHorizontalRail
                  title={formatLabelCategoryRail('Rising', selectedCategoryTab)}
                  data={categoryRisingRail}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
            case 'NewCreators':
              return (
                <LiveTVHorizontalRail
                  title="New creators"
                  data={newCreatorsRail}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
            case 'JustStarted':
              return (
                <LiveTVHorizontalRail
                  title="Just started"
                  data={justStartedRail}
                  loading={uiLoading}
                  itemWidth={292}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item: stream }) => (
                    <StreamCard stream={stream} onPress={handleStreamPress} />
                  )}
                />
              );
            case 'FindResults':
              return (
                <View style={styles.findResultsWrap}>
                  <Text style={styles.findHeading}>Results</Text>
                  {uiLoading ? (
                    <View style={styles.findSkeletonList}>
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <View key={`find-skeleton-${idx}`} style={styles.findSkeletonRow} />
                      ))}
                    </View>
                  ) : findResults.length === 0 ? (
                    <View style={styles.findEmpty}>
                      <Text style={styles.findEmptyTitle}>No results</Text>
                      <Text style={styles.findEmptySubtitle}>Try another search term.</Text>
                    </View>
                  ) : (
                    <View style={styles.findList}>
                      {findResults.slice(0, 12).map((s) => (
                        <LiveTVFindResultRow key={s.id} stream={s} onPress={handleStreamPress} />
                      ))}
                    </View>
                  )}
                </View>
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
      paddingBottom: 12,
    },
    titleBlock: {
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -0.6,
      marginBottom: 2,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 12,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      height: 46,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    searchIcon: {
      fontSize: 18,
      marginRight: 8,
      opacity: 0.5,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    clearButton: {
      padding: 4,
    },
    clearIcon: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontWeight: '700',
    },
    hintRow: {
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    hintText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    findControlsRow: {
      paddingHorizontal: 16,
      paddingTop: 10,
      flexDirection: 'row',
      gap: 10,
    },
    findButton: {
      flex: 1,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    findButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },
    followedEmpty: {
      paddingVertical: 22,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    followedEmptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '900',
      marginBottom: 4,
    },
    followedEmptySubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    categoryBlock: {
      paddingTop: 8,
      paddingBottom: 6,
    },
    categoryHeading: {
      paddingHorizontal: 16,
      paddingTop: 10,
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    findResultsWrap: {
      paddingTop: 12,
    },
    findHeading: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.4,
    },
    findList: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    findSkeletonList: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
    },
    findSkeletonRow: {
      height: 72,
      borderRadius: 16,
      backgroundColor: skeletonBase,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    findEmpty: {
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    findEmptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '900',
      marginBottom: 4,
    },
    findEmptySubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}

