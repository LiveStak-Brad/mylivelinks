'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EmailSignupCard } from '@/components/EmailSignupCard';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  type LiveTVGenderFilter,
  LiveTVHorizontalRail,
  LiveTVRoomChannelCard,
  type LiveTVRoomChannel,
  StreamCard,
  type Stream,
} from '@/components/livetv';

const SPECIAL_FILTERS = ['Trending', 'Featured', 'Rooms', 'Battles'];
const CATEGORY_FILTERS = ['IRL', 'Music', 'Gaming', 'Comedy', 'Just Chatting'];
const ALL_FILTERS = [...SPECIAL_FILTERS, ...CATEGORY_FILTERS];

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

export default function LiveTVPage() {
  const [searchQuery, setSearchQuery] = useState('');
  // Initialize with consistent default - will sync from localStorage in useEffect
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('Trending');
  const [genderFilter, setGenderFilter] = useState<LiveTVGenderFilter>('All');
  const [uiLoading, setUiLoading] = useState(true);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(true);
  const [rooms, setRooms] = useState<LiveTVRoomChannel[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // Sync from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem('livetv_active_filter');
    if (saved && ALL_FILTERS.includes(saved)) {
      setActiveQuickFilter(saved);
    }
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const preventPullToRefresh = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      const scrollableElement = document.querySelector('.overflow-y-auto');
      if (scrollableElement && scrollableElement.scrollTop === 0) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
    return () => document.removeEventListener('touchmove', preventPullToRefresh);
  }, []);

  // Only save to localStorage after initial mount
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem('livetv_active_filter', activeQuickFilter);
    }
  }, [activeQuickFilter, hasMounted]);

  useEffect(() => {
    let cancelled = false;

    const loadStreams = async () => {
      try {
        setStreamsLoading(true);
        const res = await fetch('/api/livetv/streams', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        const next = Array.isArray(json?.streams) ? (json.streams as Stream[]) : [];
        if (!cancelled) setStreams(next);
      } catch {
        if (!cancelled) setStreams([]);
      } finally {
        if (!cancelled) setStreamsLoading(false);
      }
    };

    const loadRooms = async () => {
      try {
        setRoomsLoading(true);
        const res = await fetch('/api/livetv/rooms', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load rooms');
        const json = await res.json();
        const next = Array.isArray(json?.rooms) ? (json.rooms as LiveTVRoomChannel[]) : [];
        if (!cancelled) setRooms(next);
      } catch {
        if (!cancelled) setRooms([]);
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    };

    void loadStreams();
    void loadRooms();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyGenderFilter = useCallback(
    <T extends { gender?: 'Men' | 'Women' }>(items: T[]) => {
      if (genderFilter === 'All') return items;
      return items.filter((i) => i.gender === genderFilter);
    },
    [genderFilter]
  );

  const streamsByGender = useMemo(() => applyGenderFilter(streams), [applyGenderFilter, streams]);
  const roomsByGender = useMemo(() => applyGenderFilter(rooms), [applyGenderFilter, rooms]);

  const allStreamsSortedByPopularity = useMemo(
    () => streamsByGender.slice().sort((a, b) => b.viewer_count - a.viewer_count),
    [streamsByGender]
  );

  const featuredStreams = useMemo(
    () => streamsByGender.filter((s) => (s.badges ?? []).includes('Featured')),
    [streamsByGender]
  );

  const battlesStreams = useMemo(
    () => streamsByGender.filter((s) => s.category === 'Battles').sort((a, b) => b.viewer_count - a.viewer_count),
    [streamsByGender]
  );

  const roomsByCategory = useCallback(
    (category: string) => {
      return roomsByGender.filter((r) => {
        const roomCat = (r.category || '').toLowerCase();
        if (category === 'Just Chatting') return roomCat === 'entertainment' || roomCat === 'lifestyle';
        if (category === 'Music') return roomCat === 'music';
        if (category === 'Gaming') return roomCat === 'gaming';
        if (category === 'Comedy') return roomCat === 'comedy';
        return true;
      });
    },
    [roomsByGender]
  );

  const getCategoryStreams = useCallback(
    (category: string) => {
      return streamsByGender.filter((s) => s.category === category);
    },
    [streamsByGender]
  );

  const categoryTrendingRail = useMemo(() => {
    if (!CATEGORY_FILTERS.includes(activeQuickFilter)) return [];
    const categoryStreams = getCategoryStreams(activeQuickFilter);
    return categoryStreams.filter((s) => (s.badges ?? []).includes('Trending'));
  }, [activeQuickFilter, getCategoryStreams]);

  const categoryNewRail = useMemo(() => {
    if (!CATEGORY_FILTERS.includes(activeQuickFilter)) return [];
    const categoryStreams = getCategoryStreams(activeQuickFilter);
    return categoryStreams.slice(0, 8);
  }, [activeQuickFilter, getCategoryStreams]);

  const categoryNearbyRail = useMemo(() => {
    if (!CATEGORY_FILTERS.includes(activeQuickFilter)) return [];
    const categoryStreams = getCategoryStreams(activeQuickFilter);
    return categoryStreams.slice().sort((a, b) => b.viewer_count - a.viewer_count).slice(0, 8);
  }, [activeQuickFilter, getCategoryStreams]);

  const railItems = useMemo((): RailItem[] => {
    if (activeQuickFilter === 'Trending') return [{ key: 'TrendingGrid' }];
    if (activeQuickFilter === 'Featured') return [{ key: 'FeaturedGrid' }];
    if (activeQuickFilter === 'Battles') return [{ key: 'BattlesGrid' }];
    if (activeQuickFilter === 'Rooms') {
      return [
        { key: 'RoomsJustChatting' },
        { key: 'RoomsMusic' },
        { key: 'RoomsGaming' },
        { key: 'RoomsComedy' },
      ];
    }
    if (CATEGORY_FILTERS.includes(activeQuickFilter)) {
      return [{ key: 'CategoryTrending' }, { key: 'CategoryNew' }, { key: 'CategoryNearby' }];
    }
    return [{ key: 'TrendingGrid' }];
  }, [activeQuickFilter]);

  useEffect(() => {
    setUiLoading(true);
    const timeoutId = setTimeout(() => setUiLoading(false), 550);
    return () => clearTimeout(timeoutId);
  }, [activeQuickFilter, genderFilter]);

  return (
    <main
      id="main"
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-24 md:pb-8 relative flex flex-col"
    >
      {/* Mobile App Waitlist Banner */}
      <div className="flex justify-center py-4">
        <EmailSignupCard placement="banner" />
      </div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="mx-auto max-w-[1600px] relative z-10 w-full flex-1 flex flex-col">
        <div className="sticky top-0 z-20 bg-background/98 backdrop-blur-2xl border-b-2 border-border/30 shadow-xl flex-shrink-0">
          <div className="px-4 sm:px-6 pt-3 pb-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-accent/8 to-primary/8 opacity-60" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]" />
            <div className="relative flex items-center gap-3">
              <div className="flex-shrink-0">
                <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foreground via-primary to-foreground tracking-tight leading-none">
                  LiveTV
                </h1>
              </div>

              <div className="flex-1 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none transition-all group-focus-within:text-primary" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9 text-xs rounded-xl border focus:border-primary/60 shadow-sm bg-card/80 backdrop-blur-xl font-semibold placeholder:text-muted-foreground/60"
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all p-1 hover:bg-muted/80 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-full shadow-lg shadow-red-500/30 flex-shrink-0">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span>LIVE</span>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-2 space-y-2">
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
              {SPECIAL_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveQuickFilter(filter)}
                  className={cn(
                    'flex-1 min-w-[90px] px-4 py-2.5 rounded-xl font-black text-sm transition-all duration-200 snap-start',
                    activeQuickFilter === filter
                      ? 'bg-gradient-to-br from-primary via-primary to-accent text-white shadow-lg shadow-primary/30 scale-[1.02]'
                      : 'bg-gradient-to-br from-card to-card/80 text-foreground hover:from-card/90 hover:to-card/70 border-2 border-border/40 shadow-sm hover:shadow-md hover:border-primary/30'
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveQuickFilter(filter)}
                  className={cn(
                    'flex-1 px-2 py-2 rounded-lg font-bold text-xs transition-all duration-200 whitespace-nowrap',
                    activeQuickFilter === filter
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-md'
                      : 'bg-secondary/70 text-muted-foreground hover:bg-secondary/90 border border-border/40 hover:border-primary/20'
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-2">
            <div className="flex gap-2">
              <button
                onClick={() => setGenderFilter('All')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-200',
                  genderFilter === 'All'
                    ? 'bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-md'
                    : 'bg-secondary/70 text-muted-foreground hover:bg-secondary/90 border border-border/40'
                )}
              >
                All
              </button>
              <button
                onClick={() => setGenderFilter('Men')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-200',
                  genderFilter === 'Men'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-secondary/70 text-muted-foreground hover:bg-secondary/90 border border-border/40'
                )}
              >
                Men
              </button>
              <button
                onClick={() => setGenderFilter('Women')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-200',
                  genderFilter === 'Women'
                    ? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-md'
                    : 'bg-secondary/70 text-muted-foreground hover:bg-secondary/90 border border-border/40'
                )}
              >
                Women
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="py-2 pb-8">
            {railItems.map((item) => {
              switch (item.key) {
                case 'TrendingGrid':
                  return (
                    <div key="trending-grid" className="space-y-6">
                      {/* Live Rooms Section */}
                      {roomsByGender.length > 0 && (
                        <div className="px-4 py-2">
                          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-3 flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 animate-pulse shadow-lg shadow-purple-500/50" />
                            Live Rooms
                          </h2>
                          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {roomsByGender.map((room) => (
                              <LiveTVRoomChannelCard key={room.id} room={room} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Trending Streams */}
                      <div className="px-4 py-2">
                        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-3 flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse shadow-lg shadow-red-500/50" />
                          Trending Now
                        </h2>
                        {uiLoading || streamsLoading ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                            {Array.from({ length: 10 }).map((_, idx) => (
                              <div
                                key={`trending-skeleton-${idx}`}
                                className="aspect-[3/4] bg-muted animate-pulse rounded-2xl border border-border"
                              />
                            ))}
                          </div>
                        ) : allStreamsSortedByPopularity.length === 0 && roomsByGender.length === 0 ? (
                          <div className="rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-dashed border-border/50 p-8 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.08),transparent)]" />
                            <div className="relative space-y-3">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center mx-auto">
                                <span className="text-3xl">📈</span>
                              </div>
                              <h3 className="font-black text-lg text-foreground text-center">No streams available</h3>
                              <p className="text-sm font-semibold text-muted-foreground text-center">
                                Check back soon for live content
                              </p>
                            </div>
                          </div>
                        ) : allStreamsSortedByPopularity.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No individual streams right now. Check out the live rooms above!
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                            {allStreamsSortedByPopularity.map((stream) => (
                              <StreamCard key={stream.id} stream={stream} flexibleWidth />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );

                case 'FeaturedGrid':
                  return (
                    <div key="featured-grid" className="px-4 py-2">
                      <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-3 flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 animate-pulse shadow-lg shadow-amber-500/50" />
                        Featured Streamers
                      </h2>
                      {uiLoading || streamsLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                          {Array.from({ length: 10 }).map((_, idx) => (
                            <div
                              key={`featured-skeleton-${idx}`}
                              className="aspect-[3/4] bg-muted animate-pulse rounded-2xl border border-border"
                            />
                          ))}
                        </div>
                      ) : featuredStreams.length === 0 ? (
                        <div className="rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-dashed border-border/50 p-8 relative overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.08),transparent)]" />
                          <div className="relative space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mx-auto">
                              <span className="text-3xl">⭐</span>
                            </div>
                            <h3 className="font-black text-lg text-foreground text-center">No featured streams</h3>
                            <p className="text-sm font-semibold text-muted-foreground text-center">
                              Check back soon for featured content
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                          {featuredStreams.map((stream) => (
                            <StreamCard key={stream.id} stream={stream} flexibleWidth />
                          ))}
                        </div>
                      )}
                    </div>
                  );

                case 'BattlesGrid':
                  return (
                    <div key="battles-grid" className="px-4 py-2">
                      <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-3 flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 animate-pulse shadow-lg shadow-purple-500/50" />
                        Live Battles
                      </h2>
                      {uiLoading || streamsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Array.from({ length: 6 }).map((_, idx) => (
                            <div
                              key={`battles-skeleton-${idx}`}
                              className="aspect-[2/1] bg-muted animate-pulse rounded-2xl border border-border"
                            />
                          ))}
                        </div>
                      ) : battlesStreams.length === 0 ? (
                        <div className="rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-dashed border-border/50 p-8 relative overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.08),transparent)]" />
                          <div className="relative space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mx-auto">
                              <span className="text-3xl">⚔️</span>
                            </div>
                            <h3 className="font-black text-lg text-foreground text-center">No battles right now</h3>
                            <p className="text-sm font-semibold text-muted-foreground text-center">
                              Check back soon for epic battles
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {battlesStreams.map((stream) => (
                            <div
                              key={stream.id}
                              className="relative group cursor-pointer bg-gradient-to-br from-card to-card/95 rounded-2xl border-2 border-border overflow-hidden shadow-lg hover:shadow-2xl hover:border-purple-500/50 transition-all duration-300"
                            >
                              <div className="flex h-48 sm:h-56">
                                <div className="flex-1 relative bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-r border-border/50">
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg mb-3">
                                      {stream.streamer_display_name.slice(0, 1)}
                                    </div>
                                    <h3 className="font-black text-sm sm:text-base text-foreground text-center mb-1">
                                      {stream.streamer_display_name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full">
                                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                      <span className="text-xs font-bold text-foreground">
                                        {Math.floor(stream.viewer_count * 0.6)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center justify-center z-10">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-2xl border-4 border-background group-hover:scale-110 transition-transform">
                                    <span className="text-white font-black text-xs sm:text-sm">VS</span>
                                  </div>
                                </div>

                                <div className="flex-1 relative bg-gradient-to-br from-red-500/10 to-red-600/10 border-l border-border/50">
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg mb-3">
                                      {stream.streamer_display_name.slice(-1)}
                                    </div>
                                    <h3 className="font-black text-sm sm:text-base text-foreground text-center mb-1">
                                      Opponent
                                    </h3>
                                    <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full">
                                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                      <span className="text-xs font-bold text-foreground">
                                        {Math.floor(stream.viewer_count * 0.4)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 px-4 py-3 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">⚔️</span>
                                    <span className="text-xs sm:text-sm font-black text-muted-foreground">LIVE BATTLE</span>
                                  </div>
                                  <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-lg">
                                    <span className="text-xs font-bold text-muted-foreground">Total:</span>
                                    <span className="text-sm font-black text-foreground">{stream.viewer_count}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-600/0 group-hover:from-purple-500/10 group-hover:to-purple-600/10 transition-all duration-300 pointer-events-none" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );

                case 'RoomsJustChatting':
                  return (
                    <LiveTVHorizontalRail
                      key="rooms-just-chatting"
                      title="Just Chatting Rooms"
                      data={roomsByCategory('Just Chatting')}
                      loading={uiLoading}
                      itemWidth={232}
                      keyExtractor={(r) => r.id}
                      renderItem={({ item: room }) => <LiveTVRoomChannelCard room={room} />}
                    />
                  );

                case 'RoomsMusic':
                  return (
                    <LiveTVHorizontalRail
                      key="rooms-music"
                      title="Music Rooms"
                      data={roomsByCategory('Music')}
                      loading={uiLoading}
                      itemWidth={232}
                      keyExtractor={(r) => r.id}
                      renderItem={({ item: room }) => <LiveTVRoomChannelCard room={room} />}
                    />
                  );

                case 'RoomsGaming':
                  return (
                    <LiveTVHorizontalRail
                      key="rooms-gaming"
                      title="Gaming Rooms"
                      data={roomsByCategory('Gaming')}
                      loading={uiLoading}
                      itemWidth={232}
                      keyExtractor={(r) => r.id}
                      renderItem={({ item: room }) => <LiveTVRoomChannelCard room={room} />}
                    />
                  );

                case 'RoomsComedy':
                  return (
                    <LiveTVHorizontalRail
                      key="rooms-comedy"
                      title="Comedy Rooms"
                      data={roomsByCategory('Comedy')}
                      loading={uiLoading}
                      itemWidth={232}
                      keyExtractor={(r) => r.id}
                      renderItem={({ item: room }) => <LiveTVRoomChannelCard room={room} />}
                    />
                  );

                case 'CategoryTrending':
                  return (
                    <LiveTVHorizontalRail
                      key="category-trending"
                      title="Trending"
                      data={categoryTrendingRail}
                      loading={uiLoading || streamsLoading}
                      itemWidth={292}
                      keyExtractor={(s) => s.id}
                      renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                    />
                  );

                case 'CategoryNew':
                  return (
                    <LiveTVHorizontalRail
                      key="category-new"
                      title="New"
                      data={categoryNewRail}
                      loading={uiLoading || streamsLoading}
                      itemWidth={292}
                      keyExtractor={(s) => s.id}
                      renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                    />
                  );

                case 'CategoryNearby':
                  return (
                    <LiveTVHorizontalRail
                      key="category-nearby"
                      title="Nearby"
                      data={categoryNearbyRail}
                      loading={uiLoading || streamsLoading}
                      itemWidth={292}
                      keyExtractor={(s) => s.id}
                      renderItem={({ item: stream }) => <StreamCard stream={stream} />}
                    />
                  );

                default:
                  return null;
              }
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
