-- ============================================================================
-- WATCH FEED RPCs + PROFILE TABS RPCs
-- ============================================================================
-- RPC functions for Watch feed, favorites, reposts, and profile tabs
-- ============================================================================

BEGIN;

-- ============================================================================
-- RPC: toggle_favorite
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_toggle_favorite(uuid);

CREATE OR REPLACE FUNCTION public.rpc_toggle_favorite(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check if already favorited
  SELECT EXISTS(
    SELECT 1 FROM public.post_favorites
    WHERE profile_id = v_user_id AND post_id = p_post_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove favorite
    DELETE FROM public.post_favorites
    WHERE profile_id = v_user_id AND post_id = p_post_id;
    RETURN jsonb_build_object('favorited', false);
  ELSE
    -- Add favorite
    INSERT INTO public.post_favorites (profile_id, post_id)
    VALUES (v_user_id, p_post_id)
    ON CONFLICT (profile_id, post_id) DO NOTHING;
    RETURN jsonb_build_object('favorited', true);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_toggle_favorite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_toggle_favorite(uuid) TO authenticated;

-- ============================================================================
-- RPC: toggle_repost
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_toggle_repost(uuid);

CREATE OR REPLACE FUNCTION public.rpc_toggle_repost(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check if already reposted
  SELECT EXISTS(
    SELECT 1 FROM public.post_reposts
    WHERE profile_id = v_user_id AND post_id = p_post_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove repost
    DELETE FROM public.post_reposts
    WHERE profile_id = v_user_id AND post_id = p_post_id;
    RETURN jsonb_build_object('reposted', false);
  ELSE
    -- Add repost
    INSERT INTO public.post_reposts (profile_id, post_id)
    VALUES (v_user_id, p_post_id)
    ON CONFLICT (profile_id, post_id) DO NOTHING;
    RETURN jsonb_build_object('reposted', true);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_toggle_repost(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_toggle_repost(uuid) TO authenticated;

-- ============================================================================
-- RPC: get_watch_feed
-- Returns mixed video posts + live streams for Watch tab
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
      EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = pr.id) AS is_following
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
      EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = pr.id) AS is_following
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
  SELECT *
  FROM combined
  ORDER BY
    -- Live streams first for trending/for_you
    CASE WHEN p_tab IN ('trending', 'for_you') AND item_type = 'live' THEN 0 ELSE 1 END,
    -- Then by engagement for trending
    CASE WHEN p_tab = 'trending' THEN like_count + comment_count * 2 + share_count * 3 ELSE 0 END DESC,
    -- Otherwise by date
    created_at DESC,
    item_id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) TO authenticated;

-- ============================================================================
-- RPC: get_profile_videos
-- Returns all video posts for a profile (including vlogs)
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_profile_videos(uuid, integer, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_profile_videos(
  p_profile_id uuid,
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  title text,
  caption text,
  media_url text,
  thumbnail_url text,
  is_vlog boolean,
  like_count bigint,
  comment_count bigint,
  view_count bigint,
  duration_seconds integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p.id AS post_id,
    p.title,
    p.text_content AS caption,
    p.media_url,
    p.thumbnail_url,
    COALESCE(p.is_vlog, false) AS is_vlog,
    COALESCE(p.likes_count, p.like_count, 0)::bigint AS like_count,
    COALESCE(p.comment_count, 0)::bigint AS comment_count,
    COALESCE(p.views_count, 0)::bigint AS view_count,
    p.duration_seconds,
    p.created_at
  FROM public.posts p
  WHERE p.author_id = p_profile_id
    AND p.visibility = 'public'
    AND p.media_url IS NOT NULL
    AND (p.media_type = 'video' OR p.media_url LIKE '%.mp4' OR p.media_url LIKE '%.webm' OR p.media_url LIKE '%.mov')
    AND (
      p_before_created_at IS NULL
      OR p_before_id IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.rpc_get_profile_videos(uuid, integer, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_videos(uuid, integer, timestamptz, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_videos(uuid, integer, timestamptz, uuid) TO authenticated;

-- ============================================================================
-- RPC: get_profile_vlogs
-- Returns only vlog posts for a profile
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_profile_vlogs(uuid, integer, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_profile_vlogs(
  p_profile_id uuid,
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  title text,
  caption text,
  media_url text,
  thumbnail_url text,
  like_count bigint,
  comment_count bigint,
  view_count bigint,
  duration_seconds integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p.id AS post_id,
    p.title,
    p.text_content AS caption,
    p.media_url,
    p.thumbnail_url,
    COALESCE(p.likes_count, p.like_count, 0)::bigint AS like_count,
    COALESCE(p.comment_count, 0)::bigint AS comment_count,
    COALESCE(p.views_count, 0)::bigint AS view_count,
    p.duration_seconds,
    p.created_at
  FROM public.posts p
  WHERE p.author_id = p_profile_id
    AND p.visibility = 'public'
    AND p.is_vlog = true
    AND (
      p_before_created_at IS NULL
      OR p_before_id IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.rpc_get_profile_vlogs(uuid, integer, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_vlogs(uuid, integer, timestamptz, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_vlogs(uuid, integer, timestamptz, uuid) TO authenticated;

-- ============================================================================
-- RPC: get_profile_reposts
-- Returns posts that a user has reposted
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_profile_reposts(uuid, integer, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_profile_reposts(
  p_profile_id uuid,
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  repost_id uuid,
  reposted_at timestamptz,
  post_id uuid,
  title text,
  caption text,
  media_url text,
  thumbnail_url text,
  like_count bigint,
  comment_count bigint,
  view_count bigint,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  post_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    r.id AS repost_id,
    r.created_at AS reposted_at,
    p.id AS post_id,
    p.title,
    p.text_content AS caption,
    p.media_url,
    p.thumbnail_url,
    COALESCE(p.likes_count, p.like_count, 0)::bigint AS like_count,
    COALESCE(p.comment_count, 0)::bigint AS comment_count,
    COALESCE(p.views_count, 0)::bigint AS view_count,
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    p.created_at AS post_created_at
  FROM public.post_reposts r
  JOIN public.posts p ON p.id = r.post_id
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE r.profile_id = p_profile_id
    AND p.visibility = 'public'
    AND (
      p_before_created_at IS NULL
      OR p_before_id IS NULL
      OR (r.created_at, r.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.rpc_get_profile_reposts(uuid, integer, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_reposts(uuid, integer, timestamptz, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_reposts(uuid, integer, timestamptz, uuid) TO authenticated;

-- ============================================================================
-- RPC: get_profile_favorites
-- Returns posts that a user has favorited (only visible to the owner)
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_profile_favorites(uuid, integer, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_profile_favorites(
  p_profile_id uuid,
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  favorite_id uuid,
  favorited_at timestamptz,
  post_id uuid,
  title text,
  caption text,
  media_url text,
  thumbnail_url text,
  like_count bigint,
  comment_count bigint,
  view_count bigint,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  post_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    f.id AS favorite_id,
    f.created_at AS favorited_at,
    p.id AS post_id,
    p.title,
    p.text_content AS caption,
    p.media_url,
    p.thumbnail_url,
    COALESCE(p.likes_count, p.like_count, 0)::bigint AS like_count,
    COALESCE(p.comment_count, 0)::bigint AS comment_count,
    COALESCE(p.views_count, 0)::bigint AS view_count,
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    p.created_at AS post_created_at
  FROM public.post_favorites f
  JOIN public.posts p ON p.id = f.post_id
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE f.profile_id = p_profile_id
    -- Only the owner can see their favorites
    AND f.profile_id = auth.uid()
    AND p.visibility = 'public'
    AND (
      p_before_created_at IS NULL
      OR p_before_id IS NULL
      OR (f.created_at, f.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY f.created_at DESC, f.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.rpc_get_profile_favorites(uuid, integer, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_favorites(uuid, integer, timestamptz, uuid) TO authenticated;

-- ============================================================================
-- RPC: get_profile_highlights
-- Returns highlight collections for a profile
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_profile_highlights(uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_profile_highlights(p_profile_id uuid)
RETURNS TABLE (
  highlight_id uuid,
  title text,
  cover_url text,
  item_count bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    h.id AS highlight_id,
    h.title,
    h.cover_url,
    (SELECT COUNT(*) FROM public.profile_highlight_items hi WHERE hi.highlight_id = h.id)::bigint AS item_count,
    h.created_at
  FROM public.profile_highlights h
  WHERE h.profile_id = p_profile_id
  ORDER BY h.sort_order ASC, h.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_profile_highlights(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_highlights(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_profile_highlights(uuid) TO authenticated;

-- ============================================================================
-- RPC: get_highlight_items
-- Returns posts within a highlight collection
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_highlight_items(uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_highlight_items(p_highlight_id uuid)
RETURNS TABLE (
  item_id uuid,
  post_id uuid,
  title text,
  caption text,
  media_url text,
  thumbnail_url text,
  like_count bigint,
  view_count bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    hi.id AS item_id,
    p.id AS post_id,
    p.title,
    p.text_content AS caption,
    p.media_url,
    p.thumbnail_url,
    COALESCE(p.likes_count, p.like_count, 0)::bigint AS like_count,
    COALESCE(p.views_count, 0)::bigint AS view_count,
    p.created_at
  FROM public.profile_highlight_items hi
  JOIN public.posts p ON p.id = hi.post_id
  WHERE hi.highlight_id = p_highlight_id
    AND p.visibility = 'public'
  ORDER BY hi.sort_order ASC, hi.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_highlight_items(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_highlight_items(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_highlight_items(uuid) TO authenticated;

-- ============================================================================
-- RPC: create_video_post
-- Creates a new video post
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_create_video_post(text, text, text, text[], text, text, boolean);

CREATE OR REPLACE FUNCTION public.rpc_create_video_post(
  p_media_url text,
  p_title text DEFAULT NULL,
  p_caption text DEFAULT NULL,
  p_hashtags text[] DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL,
  p_is_vlog boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_post_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  INSERT INTO public.posts (
    author_id,
    text_content,
    media_url,
    media_type,
    title,
    hashtags,
    location_text,
    thumbnail_url,
    is_vlog,
    visibility
  ) VALUES (
    v_user_id,
    p_caption,
    p_media_url,
    'video',
    p_title,
    p_hashtags,
    p_location_text,
    p_thumbnail_url,
    p_is_vlog,
    'public'
  )
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'post_id', v_post_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_create_video_post(text, text, text, text[], text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_video_post(text, text, text, text[], text, text, boolean) TO authenticated;

COMMIT;
