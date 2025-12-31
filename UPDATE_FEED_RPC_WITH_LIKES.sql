-- Update get_public_feed to return likes_count
-- Run this after applying APPLY_FEED_LIKES_SYSTEM.sql

DROP FUNCTION IF EXISTS public.get_public_feed(integer, timestamptz, uuid, text);

CREATE OR REPLACE FUNCTION public.get_public_feed(
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_username text DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  text_content text,
  media_url text,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  author_is_live boolean,
  comment_count bigint,
  gift_total_coins bigint,
  likes_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH base_posts AS (
    SELECT p.id, p.author_id, p.text_content, p.media_url, p.created_at, p.likes_count
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.author_id
    WHERE (
      p_username IS NULL
      OR pr.username = p_username
    )
    AND (
      p_before_created_at IS NULL
      OR p_before_id IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
    ORDER BY p.created_at DESC, p.id DESC
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
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE(ls.is_live, false) AS author_is_live,
    COALESCE(cc.comment_count, 0) AS comment_count,
    COALESCE(gt.gift_total_coins, 0) AS gift_total_coins,
    COALESCE(bp.likes_count, 0) AS likes_count
  FROM base_posts bp
  JOIN public.profiles pr ON pr.id = bp.author_id
  LEFT JOIN comment_counts cc ON cc.post_id = bp.id
  LEFT JOIN gift_totals gt ON gt.post_id = bp.id
  LEFT JOIN public.live_streams ls ON ls.profile_id = pr.id AND ls.is_live = true
  ORDER BY bp.created_at DESC, bp.id DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text) TO authenticated;
