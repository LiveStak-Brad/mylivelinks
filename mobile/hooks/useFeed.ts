import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchAuthed } from '../lib/api';
import { useAuthContext } from '../contexts/AuthContext';

export type FeedAuthor = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export type FeedPost = {
  id: string;
  text_content: string;
  media_url: string | null;
  created_at: string;
  author: FeedAuthor;
  comment_count: number;
  gift_total_coins: number;
};

type FeedCursor = { before_created_at: string; before_id: string };

type FeedResponse = {
  posts: FeedPost[];
  nextCursor: FeedCursor | null;
  limit: number;
};

type UseFeedOptions = {
  username?: string;
};

export function useFeed(options: UseFeedOptions = {}) {
  const { username } = options;
  const { getAccessToken } = useAuthContext();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<FeedCursor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const lastCursorKeyRef = useRef<string>('');

  const loadFeed = useCallback(
    async (mode: 'replace' | 'append') => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const cursor = mode === 'append' ? nextCursor : null;
        const cursorKey = cursor ? `${cursor.before_created_at}|${cursor.before_id}` : '';
        if (mode === 'append' && cursorKey && cursorKey === lastCursorKeyRef.current) {
          setNextCursor(null);
          return;
        }
        lastCursorKeyRef.current = cursorKey;
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (username) params.set('username', username);
        if (cursor?.before_created_at) params.set('before_created_at', cursor.before_created_at);
        if (cursor?.before_id) params.set('before_id', cursor.before_id);

        // CRITICAL: Get token from AuthContext (single source of truth)
        const token = await getAccessToken();
        const res = await fetchAuthed(`/api/feed?${params.toString()}`, {}, token);

        if (!res.ok) {
          setError(String(res.message || 'Failed to load feed'));
          if (mode === 'append') {
            // Avoid repeatedly calling loadMore with a stale cursor when the request fails.
            setNextCursor(null);
          }
          return;
        }

        const data = (res.data || {}) as FeedResponse;
        const nextPosts = Array.isArray(data?.posts) ? (data.posts as FeedPost[]) : [];

        if (mode === 'append' && nextPosts.length === 0) {
          setNextCursor(null);
          return;
        }

        setPosts((prev) => (mode === 'append' ? [...prev, ...nextPosts] : nextPosts));
        setNextCursor(data?.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed');
        if (mode === 'append') {
          setNextCursor(null);
        }
      } finally {
        inFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [nextCursor, username, getAccessToken]
  );

  useEffect(() => {
    void loadFeed('replace');
  }, [loadFeed]);

  const refresh = useCallback(async () => {
    await loadFeed('replace');
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    await loadFeed('append');
  }, [loadFeed, nextCursor]);

  return {
    posts,
    nextCursor,
    isLoading,
    error,
    refresh,
    loadMore,
  };
}
