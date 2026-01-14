import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type WatchTab = 'trending' | 'new' | 'nearby' | 'following' | 'for_you';
export type WatchMode = 'all' | 'live_only' | 'creator_only';

export interface WatchItem {
  id: string;
  type: 'video' | 'live';
  postId: string | null;
  liveStreamId: number | null;
  createdAt: string;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isMllPro: boolean;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  location: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  shareCount: number;
  repostCount: number;
  viewCount: number;
  viewerCount: number;
  isLiked: boolean;
  isFavorited: boolean;
  isReposted: boolean;
  isFollowing: boolean;
}

interface UseWatchFeedOptions {
  tab?: WatchTab;
  mode?: WatchMode;
  creatorProfileId?: string | null;
  viewerZip?: string | null;
  limit?: number;
}

interface UseWatchFeedResult {
  items: WatchItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setTab: (tab: WatchTab) => void;
  setMode: (mode: WatchMode, creatorProfileId?: string | null) => void;
  currentTab: WatchTab;
  currentMode: WatchMode;
  currentCreatorProfileId: string | null;
  optimisticLike: (itemId: string) => void;
  optimisticFavorite: (itemId: string) => void;
  optimisticRepost: (itemId: string) => void;
  optimisticFollow: (authorId: string) => void;
}

// Map RPC response row to WatchItem
function mapRpcRowToWatchItem(row: any): WatchItem {
  return {
    id: row.item_id,
    type: row.item_type === 'live' ? 'live' : 'video',
    postId: row.post_id || null,
    liveStreamId: row.live_stream_id || null,
    createdAt: row.created_at,
    authorId: row.author_id,
    username: row.author_username || '',
    displayName: row.author_display_name || row.author_username || '',
    avatarUrl: row.author_avatar_url || null,
    isVerified: row.author_is_verified || false,
    isMllPro: row.author_is_mll_pro || false,
    title: row.title || null,
    caption: row.caption || null,
    hashtags: row.hashtags || [],
    location: row.location_text || null,
    mediaUrl: row.media_url || null,
    thumbnailUrl: row.thumbnail_url || null,
    likeCount: Number(row.like_count) || 0,
    commentCount: Number(row.comment_count) || 0,
    favoriteCount: Number(row.favorite_count) || 0,
    shareCount: Number(row.share_count) || 0,
    repostCount: Number(row.repost_count) || 0,
    viewCount: Number(row.view_count) || 0,
    viewerCount: Number(row.viewer_count) || 0,
    isLiked: row.is_liked || false,
    isFavorited: row.is_favorited || false,
    isReposted: row.is_reposted || false,
    isFollowing: row.is_following || false,
  };
}

// Generate daily seed for for_you shuffle
function getDailySeed(viewerId: string | null): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${viewerId || 'anon'}-${date}`;
}

export function useWatchFeed(options: UseWatchFeedOptions = {}): UseWatchFeedResult {
  const {
    tab: initialTab = 'for_you',
    mode: initialMode = 'all',
    creatorProfileId: initialCreatorProfileId = null,
    viewerZip: initialViewerZip = null,
    limit = 20,
  } = options;

  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentTab, setCurrentTab] = useState<WatchTab>(initialTab);
  const [currentMode, setCurrentMode] = useState<WatchMode>(initialMode);
  const [currentCreatorProfileId, setCurrentCreatorProfileId] = useState<string | null>(initialCreatorProfileId);
  const [viewerZip, setViewerZip] = useState<string | null>(initialViewerZip);
  const [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(null);

  // Request ID for cancellation/staleness detection
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // Fetch viewer's zip code from profile on mount
  useEffect(() => {
    async function fetchViewerZip() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('zip_code')
            .eq('id', user.id)
            .single();
          if (profile?.zip_code) {
            setViewerZip(profile.zip_code);
          }
        }
      } catch (err) {
        console.warn('[useWatchFeed] Failed to fetch viewer zip:', err);
      }
    }
    if (!initialViewerZip) {
      fetchViewerZip();
    }
  }, [initialViewerZip]);

  const fetchFeed = useCallback(async (isLoadMore = false, isRefresh = false) => {
    const thisRequestId = ++requestIdRef.current;

    if (isLoadMore) {
      if (loadingMoreRef.current || !hasMore) return;
      loadingMoreRef.current = true;
    } else if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const viewerId = user?.id || null;

      const params: Record<string, any> = {
        p_mode: currentMode,
        p_tab: currentTab,
        p_limit: limit,
        p_viewer_profile_id: viewerId,
      };

      // Pass creator profile ID for creator_only mode
      if (currentMode === 'creator_only' && currentCreatorProfileId) {
        params.p_creator_profile_id = currentCreatorProfileId;
      }

      // Pass viewer zip for nearby tab
      if (currentTab === 'nearby' && viewerZip) {
        params.p_viewer_zip = viewerZip;
      }

      // Pass seed for for_you tab (daily shuffle)
      if (currentTab === 'for_you') {
        params.p_seed = getDailySeed(viewerId);
      }

      // Pagination cursor
      if (isLoadMore && cursor) {
        params.p_before_created_at = cursor.created_at;
        params.p_before_id = cursor.id;
      }

      console.log('[useWatchFeed] RPC params:', params);

      const { data, error: rpcError } = await supabase.rpc('rpc_get_watch_feed', params);

      // Check if this request is stale
      if (thisRequestId !== requestIdRef.current) {
        console.log('[useWatchFeed] Stale request ignored:', thisRequestId);
        return;
      }

      if (rpcError) {
        console.error('[useWatchFeed] RPC error:', rpcError);
        setError(rpcError.message);
        return;
      }

      const newItems = (data || []).map(mapRpcRowToWatchItem);

      if (isLoadMore) {
        // Deduplicate: filter out items that already exist in the list
        setItems(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewItems = newItems.filter((item: WatchItem) => !existingIds.has(item.id));
          return [...prev, ...uniqueNewItems];
        });
      } else {
        setItems(newItems);
      }

      setHasMore(newItems.length >= limit);

      // Update cursor from last item
      if (newItems.length > 0) {
        const lastRow = data[data.length - 1];
        setCursor({
          created_at: lastRow.created_at,
          id: lastRow.item_id,
        });
      } else if (!isLoadMore) {
        setCursor(null);
      }
    } catch (err) {
      if (thisRequestId === requestIdRef.current) {
        console.error('[useWatchFeed] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      }
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
        loadingMoreRef.current = false;
      }
    }
  }, [currentTab, currentMode, currentCreatorProfileId, viewerZip, limit, cursor, hasMore]);

  // Initial load and refetch on tab/mode/creator change
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    fetchFeed(false, false);
  }, [currentTab, currentMode, currentCreatorProfileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (loading || refreshing || !hasMore || loadingMoreRef.current) return;
    await fetchFeed(true, false);
  }, [loading, refreshing, hasMore, fetchFeed]);

  const refresh = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    await fetchFeed(false, true);
  }, [fetchFeed]);

  const setTab = useCallback((tab: WatchTab) => {
    if (tab !== currentTab) {
      setCurrentTab(tab);
    }
  }, [currentTab]);

  const setMode = useCallback((mode: WatchMode, creatorProfileId?: string | null) => {
    const newCreatorId = mode === 'creator_only' ? (creatorProfileId ?? null) : null;
    if (mode !== currentMode || newCreatorId !== currentCreatorProfileId) {
      setCurrentMode(mode);
      setCurrentCreatorProfileId(newCreatorId);
    }
  }, [currentMode, currentCreatorProfileId]);

  // Optimistic update for like action
  const optimisticLike = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId || item.postId === itemId) {
        const wasLiked = item.isLiked;
        return {
          ...item,
          isLiked: !wasLiked,
          likeCount: wasLiked ? Math.max(0, item.likeCount - 1) : item.likeCount + 1,
        };
      }
      return item;
    }));
  }, []);

  // Optimistic update for favorite action
  const optimisticFavorite = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId || item.postId === itemId) {
        const wasFavorited = item.isFavorited;
        return {
          ...item,
          isFavorited: !wasFavorited,
          favoriteCount: wasFavorited ? Math.max(0, item.favoriteCount - 1) : item.favoriteCount + 1,
        };
      }
      return item;
    }));
  }, []);

  // Optimistic update for repost action
  const optimisticRepost = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId || item.postId === itemId) {
        const wasReposted = item.isReposted;
        return {
          ...item,
          isReposted: !wasReposted,
          repostCount: wasReposted ? Math.max(0, item.repostCount - 1) : item.repostCount + 1,
        };
      }
      return item;
    }));
  }, []);

  // Optimistic update for follow action
  const optimisticFollow = useCallback((authorId: string) => {
    setItems(prev => prev.map(item => {
      if (item.authorId === authorId) {
        return {
          ...item,
          isFollowing: !item.isFollowing,
        };
      }
      return item;
    }));
  }, []);

  return {
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
  };
}
