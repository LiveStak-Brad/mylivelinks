-- ============================================================================
-- WATCH FEED V3 - Full Tabs + Modes Implementation
-- ============================================================================
-- Implements all tab behaviors (trending/new/nearby/following/for_you)
-- Implements all mode behaviors (all/live_only/creator_only)
-- Uses LANGUAGE sql like the working V2
-- ============================================================================

BEGIN;

-- ============================================================================
-- Ensure profiles.zip_code exists for nearby filtering
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_zip_code ON public.profiles(zip_code) WHERE zip_code IS NOT NULL;

-- ============================================================================
-- Drop existing function signatures to allow new parameter set
-- ============================================================================
DROP FUNCTION IF EXISTS public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid, uuid, uuid, text, text);

-- ============================================================================
-- RPC: rpc_get_watch_feed (V3 - Full Tabs + Modes)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_watch_feed(
  p_mode text DEFAULT 'all',                    -- 'all' | 'live_only' | 'creator_only'
  p_tab text DEFAULT 'for_you',                 -- 'trending' | 'new' | 'nearby' | 'following' | 'for_you'
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_viewer_profile_id uuid DEFAULT NULL,        -- explicit viewer ID (falls back to auth.uid())
  p_creator_profile_id uuid DEFAULT NULL,       -- required when p_mode='creator_only'
  p_viewer_zip text DEFAULT NULL,               -- viewer's zip code for nearby tab
  p_seed text DEFAULT NULL                      -- seed for daily shuffle (e.g. viewer_id + YYYY-MM-DD)
)
RETURNS TABLE (
  item_id uuid,
  item_type text,
  post_id uuid,
  title text,
  caption text,
  hashtags text[],
  location_text text,
  media_url text,
  thumbnail_url text,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  author_is_verified boolean,
  author_is_mll_pro boolean,
  like_count bigint,
  comment_count bigint,
  favorite_count bigint,
  share_count bigint,
  repost_count bigint,
  view_count bigint,
  viewer_count integer,
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
    SELECT pl.post_id FROM public.post_likes pl WHERE pl.profile_id = COALESCE(p_viewer_profile_id, auth.uid())
  ),
  viewer_favorites AS (
    SELECT pf.post_id FROM public.post_favorites pf WHERE pf.profile_id = COALESCE(p_viewer_profile_id, auth.uid())
  ),
  viewer_reposts AS (
    SELECT pr.post_id FROM public.post_reposts pr WHERE pr.profile_id = COALESCE(p_viewer_profile_id, auth.uid())
  ),
  viewer_following AS (
    SELECT f.followee_id FROM public.follows f WHERE f.follower_id = COALESCE(p_viewer_profile_id, auth.uid())
  ),
  comment_counts AS (
    SELECT pc.post_id, COUNT(*)::bigint AS comment_count
    FROM public.post_comments pc
    GROUP BY pc.post_id
  ),
  like_counts AS (
    SELECT pl.post_id, COUNT(*)::bigint AS like_count
    FROM public.post_likes pl
    GROUP BY pl.post_id
  ),
  nearby_zips AS (
    SELECT nz.zip_code 
    FROM public.get_nearby_zip_codes(
      COALESCE(p_viewer_zip, (SELECT prof.zip_code FROM public.profiles prof WHERE prof.id = COALESCE(p_viewer_profile_id, auth.uid()))),
      50
    ) nz
    WHERE p_tab = 'nearby'
  ),
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
      prof.id AS author_id,
      prof.username AS author_username,
      COALESCE(prof.display_name, prof.username) AS author_display_name,
      prof.avatar_url AS author_avatar_url,
      COALESCE(prof.kyc_verified, false) AS author_is_verified,
      COALESCE(prof.is_mll_pro, false) AS author_is_mll_pro,
      COALESCE(lc.like_count, p.likes_count, p.like_count, 0)::bigint AS like_count,
      COALESCE(cc.comment_count, 0)::bigint AS comment_count,
      COALESCE(p.favorite_count, 0)::bigint AS favorite_count,
      COALESCE(p.share_count, 0)::bigint AS share_count,
      COALESCE(p.repost_count, 0)::bigint AS repost_count,
      COALESCE(p.views_count, 0)::bigint AS view_count,
      0::integer AS viewer_count,
      EXISTS(SELECT 1 FROM viewer_likes vl WHERE vl.post_id = p.id) AS is_liked,
      EXISTS(SELECT 1 FROM viewer_favorites vf WHERE vf.post_id = p.id) AS is_favorited,
      EXISTS(SELECT 1 FROM viewer_reposts vr WHERE vr.post_id = p.id) AS is_reposted,
      EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = prof.id) AS is_following,
      (COALESCE(lc.like_count, p.likes_count, p.like_count, 0) * 3 + COALESCE(p.repost_count, 0) * 4 + COALESCE(p.favorite_count, 0) * 2 + COALESCE(p.views_count, 0) * 0.1)::numeric AS trending_score
    FROM public.posts p
    JOIN public.profiles prof ON prof.id = p.author_id
    LEFT JOIN comment_counts cc ON cc.post_id = p.id
    LEFT JOIN like_counts lc ON lc.post_id = p.id
    WHERE p.visibility = 'public'
      AND p.media_url IS NOT NULL
      AND (p_mode = 'all' OR p_mode = 'video_only' OR (p_mode = 'creator_only' AND prof.id = p_creator_profile_id))
      AND p_mode != 'live_only'
      AND (p_before_created_at IS NULL OR p_before_id IS NULL OR (p.created_at, p.id) < (p_before_created_at, p_before_id))
      AND (p_tab != 'following' OR EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = prof.id))
      AND (p_tab != 'nearby' OR NOT EXISTS(SELECT 1 FROM nearby_zips) OR p.zip_code IN (SELECT zip_code FROM nearby_zips) OR prof.zip_code IN (SELECT zip_code FROM nearby_zips))
  ),
  live_streams AS (
    SELECT
      prof.id AS item_id,  -- Use profile_id since ls.id is bigserial not uuid
      'live'::text AS item_type,
      NULL::uuid AS post_id,
      (COALESCE(prof.display_name, prof.username) || ' is live')::text AS title,
      NULL::text AS caption,
      NULL::text[] AS hashtags,
      NULL::text AS location_text,
      NULL::text AS media_url,
      prof.avatar_url AS thumbnail_url,
      COALESCE(ls.started_at, ls.created_at) AS created_at,
      prof.id AS author_id,
      prof.username AS author_username,
      COALESCE(prof.display_name, prof.username) AS author_display_name,
      prof.avatar_url AS author_avatar_url,
      COALESCE(prof.kyc_verified, false) AS author_is_verified,
      COALESCE(prof.is_mll_pro, false) AS author_is_mll_pro,
      0::bigint AS like_count,
      0::bigint AS comment_count,
      0::bigint AS favorite_count,
      0::bigint AS share_count,
      0::bigint AS repost_count,
      COALESCE(ls.total_viewer_minutes, 0)::bigint AS view_count,
      0::integer AS viewer_count,  -- live_streams doesn't have viewer_count column
      false AS is_liked,
      false AS is_favorited,
      false AS is_reposted,
      EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = prof.id) AS is_following,
      100000::numeric AS trending_score
    FROM public.live_streams ls
    JOIN public.profiles prof ON prof.id = ls.profile_id
    WHERE ls.started_at IS NOT NULL
      AND ls.ended_at IS NULL
      AND (p_mode = 'all' OR p_mode = 'live_only' OR (p_mode = 'creator_only' AND prof.id = p_creator_profile_id))
      AND (p_tab != 'following' OR EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = prof.id))
      AND (p_tab != 'nearby' OR NOT EXISTS(SELECT 1 FROM nearby_zips) OR prof.zip_code IN (SELECT zip_code FROM nearby_zips))
  ),
  combined AS (
    SELECT * FROM video_posts
    UNION ALL
    SELECT * FROM live_streams
  )
  SELECT
    c.item_id,
    c.item_type,
    c.post_id,
    c.title,
    c.caption,
    c.hashtags,
    c.location_text,
    c.media_url,
    c.thumbnail_url,
    c.created_at,
    c.author_id,
    c.author_username,
    c.author_display_name,
    c.author_avatar_url,
    c.author_is_verified,
    c.author_is_mll_pro,
    c.like_count,
    c.comment_count,
    c.favorite_count,
    c.share_count,
    c.repost_count,
    c.view_count,
    c.viewer_count,
    c.is_liked,
    c.is_favorited,
    c.is_reposted,
    c.is_following
  FROM combined c
  ORDER BY
    CASE WHEN c.item_type = 'live' THEN 0 ELSE 1 END,
    CASE WHEN p_tab = 'trending' THEN c.trending_score ELSE 0 END DESC,
    CASE WHEN p_tab = 'for_you' THEN ('x' || substr(md5(COALESCE(p_seed, COALESCE(p_viewer_profile_id, auth.uid())::text || to_char(CURRENT_DATE, 'YYYY-MM-DD')) || c.item_id::text), 1, 8))::bit(32)::bigint ELSE 0 END DESC,
    c.created_at DESC,
    c.item_id DESC
  LIMIT GREATEST(p_limit, 1);
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================
REVOKE ALL ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid, uuid, uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid, uuid, uuid, text, text) TO authenticated;

COMMIT;

-- ============================================================================
-- TEST SNIPPETS
-- ============================================================================
-- Run these after applying migration to validate each tab/mode

/*
-- Test: Trending tab (sorted by score = likes*3 + reposts*4 + favorites*2 + views*0.1)
SELECT item_type, title, like_count, repost_count, favorite_count, view_count
FROM rpc_get_watch_feed('all', 'trending', 10, NULL, NULL, NULL, NULL, NULL, NULL);

-- Test: New tab
SELECT item_type, title, created_at 
FROM rpc_get_watch_feed('all', 'new', 10, NULL, NULL, NULL, NULL, NULL, NULL);

-- Test: Nearby tab (requires viewer with zip_code set)
SELECT item_type, title, author_username 
FROM rpc_get_watch_feed('all', 'nearby', 10, NULL, NULL, NULL, NULL, '10001', NULL);

-- Test: Following tab (requires authenticated user with follows)
SELECT item_type, title, author_username, is_following 
FROM rpc_get_watch_feed('all', 'following', 10, NULL, NULL, NULL, NULL, NULL, NULL);

-- Test: For You tab with seed
SELECT item_type, title, author_username 
FROM rpc_get_watch_feed('all', 'for_you', 10, NULL, NULL, NULL, NULL, NULL, 'test-seed-2026-01-13');

-- Test: Live Only mode
SELECT item_type, title, viewer_count 
FROM rpc_get_watch_feed('live_only', 'for_you', 10, NULL, NULL, NULL, NULL, NULL, NULL);

-- Test: Creator Only mode (replace UUID with actual creator)
SELECT item_type, title, author_id 
FROM rpc_get_watch_feed('creator_only', 'for_you', 10, NULL, NULL, NULL, '00000000-0000-0000-0000-000000000000', NULL, NULL);

-- Test: Pagination
WITH page1 AS (
  SELECT item_id, created_at, title FROM rpc_get_watch_feed('all', 'new', 5, NULL, NULL, NULL, NULL, NULL, NULL)
)
SELECT 'Page 1' as page, * FROM page1
UNION ALL
SELECT 'Page 2' as page, item_id, created_at, title 
FROM rpc_get_watch_feed('all', 'new', 5, 
  (SELECT created_at FROM page1 ORDER BY created_at ASC LIMIT 1),
  (SELECT item_id FROM page1 ORDER BY created_at ASC LIMIT 1),
  NULL, NULL, NULL, NULL);

-- Count check per tab
SELECT 'trending' as tab, COUNT(*) FROM rpc_get_watch_feed('all', 'trending', 100, NULL, NULL, NULL, NULL, NULL, NULL)
UNION ALL
SELECT 'new' as tab, COUNT(*) FROM rpc_get_watch_feed('all', 'new', 100, NULL, NULL, NULL, NULL, NULL, NULL)
UNION ALL
SELECT 'for_you' as tab, COUNT(*) FROM rpc_get_watch_feed('all', 'for_you', 100, NULL, NULL, NULL, NULL, NULL, NULL);
*/
