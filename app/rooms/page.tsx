'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui';
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
} from '@/components/livetv';

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

/**
 * LIVETV DISCOVERY PAGE (Web)
 * 
 * Modern discovery hub for live streams and rooms.
 * Features:
 * - Quick filters (Trending, Featured, Rooms, etc.)
 * - Gender segmented control (All, Men, Women)
 * - Category tabs
 * - Horizontal scrollable rails
 * - Find/search view
 * - TikTok/Kik-level polish
 * 
 * Route: /rooms
 */
export default function LiveTVPage() {
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

  return (
    <main
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-gradient-to-br from-background via-background to-muted/20 pb-24 md:pb-8 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="mx-auto max-w-[1600px] relative z-10">
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-20 bg-background/98 backdrop-blur-2xl border-b-2 border-border/30 shadow-xl">
          {/* Title Block with gradient */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-accent/8 to-primary/8 opacity-60" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]" />
            <div className="relative flex items-center gap-3">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foreground via-primary to-foreground tracking-tight leading-none">
                  LiveTV
                </h1>
                <p className="text-[10px] sm:text-xs font-black text-muted-foreground/80 tracking-[0.15em] uppercase mt-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse shadow-lg shadow-primary/50" />
                  MyLiveLinks presents
                </p>
              </div>
              {/* Live indicator badge */}
              <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-black px-4 py-2 rounded-full shadow-lg shadow-red-500/30 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                <span>LIVE</span>
              </div>
            </div>
          </div>

          {/* Search Bar with enhanced styling */}
          <div className="px-4 sm:px-6 pb-3 sm:pb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none transition-all group-focus-within:text-primary group-focus-within:scale-110" />
              <Input
                type="search"
                placeholder="Search streams, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="relative pl-12 pr-12 h-12 sm:h-14 text-base rounded-2xl border-2 focus:border-primary/60 shadow-xl focus:shadow-2xl transition-all bg-gradient-to-r from-card/80 to-card backdrop-blur-xl font-semibold placeholder:text-muted-foreground/60"
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all p-1.5 hover:bg-muted/80 rounded-xl hover:scale-110 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          <LiveTVQuickFiltersRow
            options={QUICK_FILTERS}
            selected={activeQuickFilter}
            onSelect={setActiveQuickFilter}
          />

          {/* Gender Filter */}
          <LiveTVGenderSegmentedControl value={genderFilter} onChange={setGenderFilter} />

          {/* Nearby Hint */}
          {activeQuickFilter === 'Nearby' && (
            <div className="px-4 py-2.5">
              <p className="text-sm font-bold text-muted-foreground">Using your location</p>
            </div>
          )}

          {/* Find Controls */}
          {activeQuickFilter === 'Find' && (
            <div className="px-4 py-2.5 flex gap-2.5">
              <button className="flex-1 h-11 rounded-xl border border-border bg-secondary text-foreground text-sm font-black hover:bg-secondary/80 transition-colors">
                Filter
              </button>
              <button
                onClick={() => setFindSort((prev) => (prev === 'Trending' ? 'Popular' : 'Trending'))}
                className="flex-1 h-11 rounded-xl border border-border bg-secondary text-foreground text-sm font-black hover:bg-secondary/80 transition-colors"
              >
                Sort: {findSort}
              </button>
            </div>
          )}
        </div>

        {/* Rails Content */}
        <div className="py-4">
          {railItems.map((item) => {
            switch (item.key) {
              case 'Trending':
                return (
                  <LiveTVHorizontalRail
                    key="trending"
                    title="Trending"
                    data={trendingStreams}
                    loading={uiLoading}
                    itemWidth={292}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                  />
                );
              case 'Featured':
                return (
                  <LiveTVHorizontalRail
                    key="featured"
                    title="Featured"
                    data={featuredStreams}
                    loading={uiLoading}
                    itemWidth={292}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                  />
                );
              case 'Rooms':
                return (
                  <LiveTVHorizontalRail
                    key="rooms"
                    title="Rooms"
                    data={roomsByGender}
                    loading={uiLoading}
                    itemWidth={232}
                    keyExtractor={(r) => r.id}
                    renderItem={({ item: room }) => <LiveTVRoomChannelCard room={room} />}
                  />
                );
              case 'Popular':
                return (
                  <LiveTVHorizontalRail
                    key="popular"
                    title="Popular"
                    data={popularStreams}
                    loading={uiLoading}
                    itemWidth={292}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                  />
                );
              case 'Followed':
                return (
                  <LiveTVHorizontalRail
                    key="followed"
                    title="Followed"
                    data={followedStreams}
                    loading={uiLoading}
                    itemWidth={292}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                    emptyState={
                      <div className="rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-dashed border-border/50 p-6 sm:p-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.08),transparent)]" />
                        <div className="relative space-y-3">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto">
                            <span className="text-3xl">👥</span>
                          </div>
                          <h3 className="font-black text-base sm:text-lg text-foreground text-center">
                            Follow creators to see them here
                          </h3>
                          <p className="text-sm sm:text-base font-semibold text-muted-foreground leading-relaxed text-center max-w-sm mx-auto">
                            Your followed creators will show up as they go live
                          </p>
                        </div>
                      </div>
                    }
                  />
                );
              case 'CategoryTabs':
                return (
                  <div key="category-tabs" className="py-2">
                    <LiveTVCategoryTabs
                      tabs={CATEGORY_TABS}
                      selected={selectedCategoryTab}
                      onSelect={setSelectedCategoryTab}
                    />
                    <div className="px-4 pt-2.5">
                      <h2 className="text-sm font-extrabold text-muted-foreground tracking-wide uppercase">
                        Popular by Category
                      </h2>
                    </div>
                  </div>
                );
              case 'CategoryTop':
                return (
                  <LiveTVHorizontalRail
                    key="category-top"
                    title={formatLabelCategoryRail('Top', selectedCategoryTab)}
                    data={categoryTopRail}
                    loading={uiLoading}
                    itemWidth={292}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                  />
                );
              case 'CategoryRising':
                return (
                  <LiveTVHorizontalRail
                    key="category-rising"
                    title={formatLabelCategoryRail('Rising', selectedCategoryTab)}
                    data={categoryRisingRail}
                    loading={uiLoading}
                    itemWidth={292}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                  />
                );
              case 'NewCreators':
                return (
                  <LiveTVHorizontalRail
                    key="new-creators"
                    title="New creators"
                    data={newCreatorsRail}
                    loading={uiLoading}
                    itemWidth={292}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                  />
                );
              case 'JustStarted':
                return (
                  <LiveTVHorizontalRail
                    key="just-started"
                    title="Just started"
                    data={justStartedRail}
                    loading={uiLoading}
                    itemWidth={292}
                    keyExtractor={(s) => s.id}
                    renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                  />
                );
              case 'FindResults':
                return (
                  <div key="find-results" className="px-4 py-3">
                    <h2 className="text-xl font-black text-foreground tracking-tight mb-2.5">Results</h2>
                    {uiLoading ? (
                      <div className="space-y-0 border border-border rounded-2xl overflow-hidden">
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <div
                            key={`find-skeleton-${idx}`}
                            className="h-20 bg-muted animate-pulse border-b border-border last:border-b-0"
                          />
                        ))}
                      </div>
                    ) : findResults.length === 0 ? (
                      <div className="rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-dashed border-border/50 p-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(120,119,198,0.08),transparent)]" />
                        <div className="relative space-y-3">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mx-auto">
                            <span className="text-3xl">🔍</span>
                          </div>
                          <h3 className="font-black text-lg text-foreground text-center">No results</h3>
                          <p className="text-sm font-semibold text-muted-foreground text-center">
                            Try another search term
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-border rounded-2xl overflow-hidden">
                        {findResults.slice(0, 12).map((s) => (
                          <LiveTVFindResultRow key={s.id} stream={s} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    </main>
  );
}
