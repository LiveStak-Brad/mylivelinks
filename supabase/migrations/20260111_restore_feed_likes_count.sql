-- Migration: Restore likes_count to get_public_feed RPC
-- The 20260110 migration overwrote the function and removed likes_count

BEGIN;

DROP FUNCTION IF EXISTS public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.get_public_feed(
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_viewer_id uuid DEFAULT NULL,
  p_filter text DEFAULT 'global',
  p_media_only boolean DEFAULT false
)
RETURNS TABLE (
  post_id uuid,
  text_content text,
  media_url text,
  created_at timestamptz,
  visibility text,
  is_pinned boolean,
  pinned_at timestamptz,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  comment_count bigint,
  gift_total_coins bigint,
  likes_count integer,
  views_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH base_posts AS (
    SELECT p.id, p.author_id, p.text_content, p.media_url, p.created_at, p.visibility, 
           p.is_pinned, p.pinned_at, p.likes_count, p.views_count
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.author_id
    WHERE (
      p_username IS NULL
      OR pr.username = p_username
    )
    AND (
      NOT p_media_only
      OR p.media_url IS NOT NULL
    )
    AND (
      p_before_created_at IS NULL
      OR p_before_id IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
    AND (
      CASE
        WHEN COALESCE(p_filter, 'global') = 'friends' THEN
          p_viewer_id IS NOT NULL
          AND (
            p.author_id = p_viewer_id
            OR EXISTS (
              SELECT 1
              FROM public.friends fr
              WHERE fr.user_id_1 = LEAST(p_viewer_id, p.author_id)
                AND fr.user_id_2 = GREATEST(p_viewer_id, p.author_id)
            )
          )
          AND p.visibility IN ('public', 'friends')
        WHEN COALESCE(p_filter, 'global') = 'private' THEN
          p_viewer_id IS NOT NULL
          AND p.author_id = p_viewer_id
          AND p.visibility = 'private'
        ELSE
          p.visibility = 'public'
      END
    )
    ORDER BY 
      CASE WHEN p_username IS NOT NULL THEN p.is_pinned ELSE false END DESC,
      CASE WHEN p_username IS NOT NULL THEN p.pinned_at END DESC NULLS LAST,
      p.created_at DESC, 
      p.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ),
  comment_counts AS (
    SELECT c.post_id, COUNT(*)::bigint AS comment_count
    FROM public.post_comments c
    WHERE c.post_id IN (SELECT id FROM base_posts)
    GROUP BY c.post_id
  ),
  gift_totals AS (
    SELECT pg.post_id, COALESCE(SUM(pg.coins), 0)::bigint AS gift_total_coins
    FROM public.post_gifts pg
    WHERE pg.post_id IN (SELECT id FROM base_posts)
    GROUP BY pg.post_id
  )
  SELECT
    bp.id AS post_id,
    bp.text_content,
    bp.media_url,
    bp.created_at,
    bp.visibility,
    bp.is_pinned,
    bp.pinned_at,
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE(cc.comment_count, 0) AS comment_count,
    COALESCE(gt.gift_total_coins, 0) AS gift_total_coins,
    COALESCE(bp.likes_count, 0) AS likes_count,
    COALESCE(bp.views_count, 0) AS views_count
  FROM base_posts bp
  JOIN public.profiles pr ON pr.id = bp.author_id
  LEFT JOIN comment_counts cc ON cc.post_id = bp.id
  LEFT JOIN gift_totals gt ON gt.post_id = bp.id
  ORDER BY 
    CASE WHEN p_username IS NOT NULL THEN bp.is_pinned ELSE false END DESC,
    CASE WHEN p_username IS NOT NULL THEN bp.pinned_at END DESC NULLS LAST,
    bp.created_at DESC, 
    bp.id DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) TO authenticated;

COMMIT;
