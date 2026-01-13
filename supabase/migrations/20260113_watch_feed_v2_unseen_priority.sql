-- ============================================================================
-- WATCH FEED V2 - Unlimited scrolling + Unseen content priority
-- ============================================================================
-- Updates rpc_get_watch_feed to:
-- 1. Remove 50 item hard limit for unlimited scrolling
-- 2. Prioritize content user hasn't viewed yet
-- ============================================================================

BEGIN;

-- ============================================================================
-- RPC: get_watch_feed (V2 - Unseen Priority)
-- Returns mixed video posts + live streams for Watch tab
-- Prioritizes content the user hasn't seen yet
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_watch_feed(
  p_mode text DEFAULT 'all',        -- 'all' | 'live_only' | 'video_only'
  p_tab text DEFAULT 'for_you',     -- 'trending' | 'new' | 'nearby' | 'following' | 'for_you'
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid,
  item_type text,                    -- 'video' | 'live'
  post_id uuid,
  title text,
  caption text,
  hashtags text[],
  location_text text,
  media_url text,
  thumbnail_url text,
  created_at timestamptz,
  -- Author info
  author_id uuid,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  author_is_verified boolean,
  -- Engagement counts
  like_count bigint,
  comment_count bigint,
  favorite_count bigint,
  share_count bigint,
  repost_count bigint,
  view_count bigint,
  viewer_count integer,              -- For live streams only
  -- Viewer state (for authenticated users)
  is_liked boolean,
  is_favorited boolean,
  is_reposted boolean,
  is_following boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH viewer_likes AS (
    SELECT post_id FROM public.post_likes WHERE profile_id = auth.uid()
  ),
  viewer_favorites AS (
    SELECT post_id FROM public.post_favorites WHERE profile_id = auth.uid()
  ),
  viewer_reposts AS (
    SELECT post_id FROM public.post_reposts WHERE profile_id = auth.uid()
  ),
  viewer_following AS (
    SELECT followee_id FROM public.follows WHERE follower_id = auth.uid()
  ),
  -- Get posts the user has already viewed
  viewer_views AS (
    SELECT post_id FROM public.post_views WHERE profile_id = auth.uid()
  ),
  -- Video posts
  video_posts AS (
    SELECT
      p.id AS item_id,
      'video'::text AS item_type,
      p.id AS post_id,
      p.title,
      p.text_content AS caption,
      p.hashtags,
      p.location_text,
      p.media_url,
      p.thumbnail_url,
      p.created_at,
      pr.id AS author_id,
      pr.username AS author_username,
      COALESCE(pr.display_name, pr.username) AS author_display_name,
      pr.avatar_url AS author_avatar_url,
      COALESCE(pr.kyc_verified, false) AS author_is_verified,
      COALESCE(p.likes_count, p.like_count, 0)::bigint AS like_count,
      COALESCE(p.comment_count, 0)::bigint AS comment_count,
      COALESCE(p.favorite_count, 0)::bigint AS favorite_count,
      COALESCE(p.share_count, 0)::bigint AS share_count,
      COALESCE(p.repost_count, 0)::bigint AS repost_count,
      COALESCE(p.views_count, 0)::bigint AS view_count,
      0::integer AS viewer_count,
      EXISTS(SELECT 1 FROM viewer_likes vl WHERE vl.post_id = p.id) AS is_liked,
      EXISTS(SELECT 1 FROM viewer_favorites vf WHERE vf.post_id = p.id) AS is_favorited,
      EXISTS(SELECT 1 FROM viewer_reposts vr WHERE vr.post_id = p.id) AS is_reposted,
      EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = pr.id) AS is_following,
      -- Has user seen this content?
      EXISTS(SELECT 1 FROM viewer_views vv WHERE vv.post_id = p.id) AS has_viewed
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.author_id
    WHERE p.visibility = 'public'
      AND p.media_url IS NOT NULL
      AND (p_mode = 'all' OR p_mode = 'video_only')
      AND (
        p_before_created_at IS NULL
        OR p_before_id IS NULL
        OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
      )
      AND (
        p_tab != 'following'
        OR EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = pr.id)
      )
  ),
  -- Live streams (only show actual active streams with started_at set)
  live_streams AS (
    SELECT
      pr.id AS item_id,  -- Use profile_id as unique identifier for live items
      'live'::text AS item_type,
      NULL::uuid AS post_id,
      (COALESCE(pr.display_name, pr.username) || ' is live')::text AS title,
      NULL::text AS caption,
      NULL::text[] AS hashtags,
      NULL::text AS location_text,
      NULL::text AS media_url,
      pr.avatar_url AS thumbnail_url,
      COALESCE(ls.started_at, ls.created_at) AS created_at,
      pr.id AS author_id,
      pr.username AS author_username,
      COALESCE(pr.display_name, pr.username) AS author_display_name,
      pr.avatar_url AS author_avatar_url,
      COALESCE(pr.kyc_verified, false) AS author_is_verified,
      0::bigint AS like_count,
      0::bigint AS comment_count,
      0::bigint AS favorite_count,
      0::bigint AS share_count,
      0::bigint AS repost_count,
      COALESCE(ls.total_viewer_minutes, 0)::bigint AS view_count,
      0::integer AS viewer_count,
      false AS is_liked,
      false AS is_favorited,
      false AS is_reposted,
      EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = pr.id) AS is_following,
      false AS has_viewed  -- Live streams are always "new"
    FROM public.live_streams ls
    JOIN public.profiles pr ON pr.id = ls.profile_id
    WHERE ls.started_at IS NOT NULL  -- Only show streams that have actually started
      AND ls.ended_at IS NULL  -- Only show streams that haven't ended
      AND (p_mode = 'all' OR p_mode = 'live_only')
      AND (
        p_tab != 'following'
        OR EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = pr.id)
      )
  ),
  -- Combined feed
  combined AS (
    SELECT * FROM video_posts
    UNION ALL
    SELECT * FROM live_streams
  )
  SELECT 
    item_id,
    item_type,
    post_id,
    title,
    caption,
    hashtags,
    location_text,
    media_url,
    thumbnail_url,
    created_at,
    author_id,
    author_username,
    author_display_name,
    author_avatar_url,
    author_is_verified,
    like_count,
    comment_count,
    favorite_count,
    share_count,
    repost_count,
    view_count,
    viewer_count,
    is_liked,
    is_favorited,
    is_reposted,
    is_following
  FROM combined
  ORDER BY
    -- Live streams always first
    CASE WHEN item_type = 'live' THEN 0 ELSE 1 END,
    -- Then unseen content before seen content
    CASE WHEN has_viewed THEN 1 ELSE 0 END,
    -- Then by engagement for trending
    CASE WHEN p_tab = 'trending' THEN like_count + comment_count * 2 + share_count * 3 ELSE 0 END DESC,
    -- Otherwise by date
    created_at DESC,
    item_id DESC
  LIMIT GREATEST(p_limit, 1);  -- No upper limit - allow unlimited scrolling
$$;

REVOKE ALL ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) TO authenticated;

COMMIT;
