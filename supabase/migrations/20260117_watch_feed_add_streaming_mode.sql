-- ============================================================================
-- Add streaming_mode to rpc_get_watch_feed
-- ============================================================================
-- This allows the watch feed to distinguish between solo and group live streams
-- so it can route users to the correct page and show the correct preview
-- ============================================================================

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid, uuid, uuid, text, text);

-- Recreate with streaming_mode column
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
  streaming_mode text,  -- NEW: 'solo' | 'group' for live streams, NULL for videos
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
      NULL::text AS streaming_mode,  -- NULL for videos
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
      prof.id AS item_id,
      'live'::text AS item_type,
      NULL::uuid AS post_id,
      ls.streaming_mode::text AS streaming_mode,  -- NEW: Include streaming_mode
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
      0::integer AS viewer_count,
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
    item_id,
    item_type,
    post_id,
    streaming_mode,  -- NEW: Include in final SELECT
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
    author_is_mll_pro,
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
    CASE
      WHEN p_tab = 'trending' THEN trending_score
      WHEN p_tab = 'new' THEN EXTRACT(EPOCH FROM created_at)
      WHEN p_tab = 'for_you' THEN (CASE WHEN p_seed IS NOT NULL THEN hashtext(item_id::text || p_seed) ELSE random() END)::numeric
      ELSE trending_score
    END DESC,
    created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

-- Grants
REVOKE ALL ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid, uuid, uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid, uuid, uuid, text, text) TO authenticated;

COMMIT;
