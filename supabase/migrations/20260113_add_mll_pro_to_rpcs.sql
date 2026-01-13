-- ============================================================================
-- Add author_is_mll_pro to profile RPCs
-- ============================================================================

BEGIN;

-- ============================================================================
-- Update rpc_get_profile_reposts to include author_is_mll_pro
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
  author_is_mll_pro boolean,
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
    COALESCE(p.like_count, 0)::bigint AS like_count,
    COALESCE(p.comment_count, 0)::bigint AS comment_count,
    COALESCE(p.views_count, 0)::bigint AS view_count,
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE(pr.is_mll_pro, false) AS author_is_mll_pro,
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
-- Update rpc_get_profile_favorites to include author_is_mll_pro
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
  author_is_mll_pro boolean,
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
    COALESCE(p.like_count, 0)::bigint AS like_count,
    COALESCE(p.comment_count, 0)::bigint AS comment_count,
    COALESCE(p.views_count, 0)::bigint AS view_count,
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE(pr.is_mll_pro, false) AS author_is_mll_pro,
    p.created_at AS post_created_at
  FROM public.post_favorites f
  JOIN public.posts p ON p.id = f.post_id
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE f.profile_id = p_profile_id
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

COMMIT;
