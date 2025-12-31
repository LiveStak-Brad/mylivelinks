/**
 * TRENDING SYSTEM - FRONTEND INTEGRATION HOOKS
 * 
 * Minimal surgical additions to existing components.
 * DO NOT refactor large systems or redesign UI.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase';

// ============================================================================
// 1) VIEW JOIN/LEAVE TRACKING
// ============================================================================

/**
 * Hook to track when viewer joins/leaves a live stream
 * Call this in /live/[username] viewer route after stream_id is known
 * 
 * Usage in LiveRoom.tsx or solo viewer component:
 * ```
 * const { sessionId } = useLiveViewTracking({
 *   streamId: liveStreamId,
 *   profileId: user?.id,
 *   enabled: isLive && liveStreamId != null
 * });
 * ```
 */
export function useLiveViewTracking({
  streamId,
  profileId,
  enabled = true
}: {
  streamId: string | number | null;
  profileId?: string;
  enabled?: boolean;
}) {
  const supabase = createClient();
  const sessionIdRef = useRef<string | null>(null);
  const hasJoinedRef = useRef(false);

  // Generate or retrieve anon_id for anonymous users
  const getAnonId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    let anonId = localStorage.getItem('mylivelinks_trending_anon_id');
    if (!anonId) {
      anonId = `anon-${crypto.randomUUID()}`;
      localStorage.setItem('mylivelinks_trending_anon_id', anonId);
    }
    return anonId;
  }, []);

  // Join view on mount
  useEffect(() => {
    if (!enabled || !streamId || hasJoinedRef.current) return;

    const joinView = async () => {
      try {
        const anonId = profileId ? null : getAnonId();
        
        const { data, error } = await supabase.rpc('rpc_live_view_join', {
          p_stream_id: streamId,
          p_profile_id: profileId || null,
          p_anon_id: anonId
        });

        if (error) {
          console.error('[Trending] Failed to join view:', error);
          return;
        }

        if (data && data.length > 0) {
          sessionIdRef.current = data[0].session_id;
          hasJoinedRef.current = true;
          console.log('[Trending] View joined, session:', sessionIdRef.current);
        }
      } catch (err) {
        console.error('[Trending] Exception joining view:', err);
      }
    };

    joinView();
  }, [enabled, streamId, profileId, supabase, getAnonId]);

  // Leave view on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        const sessionId = sessionIdRef.current;
        // Fire and forget - don't wait for response
        supabase.rpc('rpc_live_view_leave', {
          p_session_id: sessionId
        }).then(({ error }) => {
          if (error) {
            console.error('[Trending] Failed to leave view:', error);
          }
        });
      }
    };
  }, [supabase]);

  return {
    sessionId: sessionIdRef.current
  };
}

// ============================================================================
// 2) LIKE TOGGLE
// ============================================================================

/**
 * Hook for tap-to-like functionality
 * 
 * Usage:
 * ```
 * const { isLiked, likesCount, toggleLike } = useLiveLike({
 *   streamId: liveStreamId,
 *   profileId: user?.id,
 *   enabled: isAuthenticated && isLive
 * });
 * 
 * // In render:
 * <button onClick={toggleLike}>
 *   {isLiked ? '❤️' : '🤍'} {likesCount}
 * </button>
 * ```
 */
export function useLiveLike({
  streamId,
  profileId,
  enabled = true
}: {
  streamId: string | number | null;
  profileId?: string;
  enabled?: boolean;
}) {
  const supabase = createClient();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial like state
  useEffect(() => {
    if (!enabled || !streamId || !profileId) return;

    const loadLikeState = async () => {
      try {
        const { data, error } = await supabase.rpc('rpc_get_stream_trending_stats', {
          p_stream_id: streamId
        });

        if (!error && data && data.length > 0) {
          setIsLiked(data[0].is_user_liked);
          setLikesCount(data[0].likes_count);
        }
      } catch (err) {
        console.error('[Trending] Failed to load like state:', err);
      }
    };

    loadLikeState();
  }, [enabled, streamId, profileId, supabase]);

  const toggleLike = useCallback(async () => {
    if (!enabled || !streamId || !profileId || isLoading) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('rpc_live_like_toggle', {
        p_stream_id: streamId,
        p_profile_id: profileId
      });

      if (error) {
        console.error('[Trending] Failed to toggle like:', error);
        return;
      }

      if (data && data.length > 0) {
        setIsLiked(data[0].is_liked);
        setLikesCount(data[0].likes_count);
      }
    } catch (err) {
      console.error('[Trending] Exception toggling like:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, streamId, profileId, isLoading, supabase]);

  return {
    isLiked,
    likesCount,
    toggleLike,
    isLoading
  };
}

// ============================================================================
// 3) COMMENT TRACKING
// ============================================================================

/**
 * Function to call when user submits a chat comment
 * Add this to existing chat submit handler
 * 
 * Usage in Chat.tsx or existing chat component:
 * ```
 * const handleChatSubmit = async (message: string) => {
 *   // Existing chat logic...
 *   await existingChatSubmitFunction(message);
 *   
 *   // Add trending tracking
 *   if (liveStreamId && user?.id) {
 *     await trackLiveComment({
 *       streamId: liveStreamId,
 *       profileId: user.id,
 *       body: message
 *     });
 *   }
 * };
 * ```
 */
export async function trackLiveComment({
  streamId,
  profileId,
  body
}: {
  streamId: string | number;
  profileId: string;
  body: string;
}) {
  const supabase = createClient();

  try {
    const { error } = await supabase.rpc('rpc_live_comment_add', {
      p_stream_id: streamId,
      p_profile_id: profileId,
      p_body: body
    });

    if (error) {
      console.error('[Trending] Failed to track comment:', error);
    }
  } catch (err) {
    console.error('[Trending] Exception tracking comment:', err);
  }
}

// ============================================================================
// 4) GIFT TRACKING (SERVER-SIDE OR IN EXISTING GIFT PIPELINE)
// ============================================================================

/**
 * Call this in existing gift processing logic (server-side preferred)
 * 
 * Usage in existing gift pipeline (after gift is confirmed):
 * ```
 * // In GiftModal.tsx after successful gift, or in API route
 * await trackLiveGift({
 *   streamId: liveStreamId,
 *   amountValue: giftType.coin_cost
 * });
 * ```
 * 
 * IMPORTANT: This should be called server-side (service_role client)
 * or via existing secure gifts RPC that has elevated permissions
 */
export async function trackLiveGift({
  streamId,
  amountValue
}: {
  streamId: string | number;
  amountValue: number;
}) {
  // NOTE: This should use service_role client in production
  // For now, we'll document where to add this call
  const supabase = createClient();

  try {
    const { error } = await supabase.rpc('rpc_live_gift_add', {
      p_stream_id: streamId,
      p_amount_value: amountValue
    });

    if (error) {
      console.error('[Trending] Failed to track gift:', error);
    }
  } catch (err) {
    console.error('[Trending] Exception tracking gift:', err);
  }
}

// ============================================================================
// 5) FETCH TRENDING STREAMS
// ============================================================================

/**
 * Fetch trending live streams for display
 * 
 * Usage in Trending page or component:
 * ```
 * const { streams, isLoading, refresh } = useTrendingStreams({ limit: 20 });
 * 
 * return (
 *   <div>
 *     {streams.map(stream => (
 *       <TrendingStreamCard key={stream.stream_id} stream={stream} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useTrendingStreams({
  limit = 20,
  offset = 0,
  enabled = true,
  refreshInterval = 10000 // Refresh every 10 seconds
}: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
  refreshInterval?: number;
} = {}) {
  const supabase = createClient();
  const [streams, setStreams] = useState<TrendingStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStreams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('rpc_get_trending_live_streams', {
        p_limit: limit,
        p_offset: offset
      });

      if (rpcError) {
        throw rpcError;
      }

      setStreams(data || []);
    } catch (err) {
      console.error('[Trending] Failed to fetch streams:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset, supabase]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;
    fetchStreams();
  }, [enabled, fetchStreams]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(fetchStreams, refreshInterval);
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, fetchStreams]);

  return {
    streams,
    isLoading,
    error,
    refresh: fetchStreams
  };
}

// Type definitions
export interface TrendingStream {
  stream_id: number;
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  started_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  gifts_value: number;
  trending_score: number;
  viewer_count: number;
}
