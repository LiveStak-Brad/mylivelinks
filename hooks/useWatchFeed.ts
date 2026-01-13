'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { WatchItemData } from '@/components/watch/WatchContentItem';

export type WatchTab = 'trending' | 'new' | 'nearby' | 'following' | 'for_you';
export type WatchMode = 'all' | 'live_only' | 'video_only';

interface UseWatchFeedOptions {
  tab?: WatchTab;
  mode?: WatchMode;
  limit?: number;
}

interface WatchFeedResult {
  items: WatchItemData[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setTab: (tab: WatchTab) => void;
  setMode: (mode: WatchMode) => void;
  currentTab: WatchTab;
  currentMode: WatchMode;
  // Optimistic update functions
  optimisticLike: (itemId: string) => void;
  optimisticFavorite: (itemId: string) => void;
  optimisticRepost: (itemId: string) => void;
}

export function useWatchFeed(options: UseWatchFeedOptions = {}): WatchFeedResult {
  const { 
    tab: initialTab = 'for_you', 
    mode: initialMode = 'all',
    limit = 50  // Increased for better infinite scroll
  } = options;

  const [items, setItems] = useState<WatchItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentTab, setCurrentTab] = useState<WatchTab>(initialTab);
  const [currentMode, setCurrentMode] = useState<WatchMode>(initialMode);
  const [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(null);

  const supabase = createClient();

  // Map RPC response to WatchItemData
  const mapToWatchItem = (row: any): WatchItemData => {
    // Generate a gradient based on the item id for visual variety
    const gradients = [
      { from: '#1a0a2e', to: '#2d1b4e' },
      { from: '#1e3a5f', to: '#0d2137' },
      { from: '#0f2027', to: '#2c5364' },
      { from: '#2d1f1f', to: '#4a3232' },
      { from: '#134e4a', to: '#0f3d3a' },
      { from: '#1a1a2e', to: '#16213e' },
    ];
    const gradientIndex = Math.abs(row.item_id?.charCodeAt(0) || 0) % gradients.length;
    const gradient = gradients[gradientIndex];

    return {
      id: row.item_id,
      type: row.item_type === 'live' ? 'live' : 'video',
      username: row.author_username,
      displayName: row.author_display_name,
      avatarUrl: row.author_avatar_url || undefined,
      authorId: row.author_id, // Profile UUID for live stream room name
      isVerified: row.author_is_verified || false,
      isFollowing: row.is_following || false,
      title: row.title || undefined,
      caption: row.caption || undefined,
      hashtags: row.hashtags || [],
      location: row.location_text || undefined,
      likeCount: Number(row.like_count) || 0,
      commentCount: Number(row.comment_count) || 0,
      favoriteCount: Number(row.favorite_count) || 0,
      shareCount: Number(row.share_count) || 0,
      repostCount: Number(row.repost_count) || 0,
      isLiked: row.is_liked || false,
      isFavorited: row.is_favorited || false,
      viewerCount: row.viewer_count || 0,
      viewCount: Number(row.view_count) || 0,
      // Use thumbnail_url, or media_url if it's an image (not video)
      thumbnailUrl: row.thumbnail_url || (row.media_url && /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(row.media_url) ? row.media_url : undefined),
      mediaUrl: row.media_url || undefined,
      gradientFrom: gradient.from,
      gradientTo: gradient.to,
      postId: row.post_id,
    };
  };

  const fetchFeed = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true);
      setError(null);
    }

    try {
      const params: Record<string, any> = {
        p_mode: currentMode,
        p_tab: currentTab,
        p_limit: limit,
      };

      if (isLoadMore && cursor) {
        params.p_before_created_at = cursor.created_at;
        params.p_before_id = cursor.id;
      }

      const { data, error: rpcError } = await supabase.rpc('rpc_get_watch_feed', params);

      if (rpcError) {
        console.error('Watch feed error:', rpcError);
        setError(rpcError.message);
        return;
      }

      const newItems = (data || []).map(mapToWatchItem);

      if (isLoadMore) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setHasMore(newItems.length >= limit);

      if (newItems.length > 0) {
        const lastItem = data[data.length - 1];
        setCursor({
          created_at: lastItem.created_at,
          id: lastItem.item_id,
        });
      }
    } catch (err) {
      console.error('Watch feed error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [supabase, currentTab, currentMode, limit, cursor]);

  // Initial load and when tab/mode changes
  useEffect(() => {
    setCursor(null);
    fetchFeed(false);
  }, [currentTab, currentMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await fetchFeed(true);
  }, [loading, hasMore, fetchFeed]);

  const refresh = useCallback(async () => {
    setCursor(null);
    await fetchFeed(false);
  }, [fetchFeed]);

  const setTab = useCallback((tab: WatchTab) => {
    if (tab !== currentTab) {
      setCurrentTab(tab);
    }
  }, [currentTab]);

  const setMode = useCallback((mode: WatchMode) => {
    if (mode !== currentMode) {
      setCurrentMode(mode);
    }
  }, [currentMode]);

  // Optimistic update for like action
  const optimisticLike = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId || (item as any).postId === itemId) {
        const wasLiked = item.isLiked;
        return {
          ...item,
          isLiked: !wasLiked,
          likeCount: wasLiked ? Math.max(0, (item.likeCount || 0) - 1) : (item.likeCount || 0) + 1,
        };
      }
      return item;
    }));
  }, []);

  // Optimistic update for favorite action
  const optimisticFavorite = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId || (item as any).postId === itemId) {
        const wasFavorited = item.isFavorited;
        return {
          ...item,
          isFavorited: !wasFavorited,
          favoriteCount: wasFavorited ? Math.max(0, (item.favoriteCount || 0) - 1) : (item.favoriteCount || 0) + 1,
        };
      }
      return item;
    }));
  }, []);

  // Optimistic update for repost action
  const optimisticRepost = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId || (item as any).postId === itemId) {
        return {
          ...item,
          repostCount: (item.repostCount || 0) + 1,
        };
      }
      return item;
    }));
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    setTab,
    setMode,
    currentTab,
    currentMode,
    optimisticLike,
    optimisticFavorite,
    optimisticRepost,
  };
}
